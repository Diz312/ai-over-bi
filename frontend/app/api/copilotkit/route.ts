import {
  CopilotRuntime,
  BuiltInAgent,
  InMemoryAgentRunner,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";

// Two-agent setup:
//   ai_over_bi — HttpAgent → ADK backend (full BI agent hierarchy)
//   default    — BuiltInAgent wrapping Anthropic haiku for peripheral tasks
//                (suggestions, CopilotTask, etc.). API key auto-resolved
//                from ANTHROPIC_API_KEY env var.
const runtime = new CopilotRuntime({
  agents: {
    ai_over_bi: new HttpAgent({ url: "http://localhost:8000/agent" }),
    default: new BuiltInAgent({ model: "anthropic/claude-3.5-haiku" }),
  },
  runner: new InMemoryAgentRunner(),
  a2ui: {}, // enables A2UI middleware — intercepts a2ui_operations in tool results
});

const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit",
  mode: "single-route",
});

// ---------------------------------------------------------------------------
// AG-UI event interception for the observability plane
//
// We tee the response stream: one copy goes to the client unchanged,
// the other is parsed for AG-UI SSE events and forwarded to the backend
// observability collector via POST /observe/agui/{session_id}.
//
// This is fire-and-forget — it must NOT add latency to the client stream.
// ---------------------------------------------------------------------------

const BACKEND = "http://localhost:8000";

function extractSessionId(body: Record<string, unknown>): string {
  // CopilotKit / AG-UI request shapes vary; try common field names
  return (
    (body.threadId as string) ??
    (body.sessionId as string) ??
    (body.session_id as string) ??
    ""
  );
}

async function forwardAguiEvents(
  stream: ReadableStream<Uint8Array>,
  sessionId: string,
): Promise<void> {
  if (!sessionId) return;

  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const batch: Record<string, unknown>[] = [];
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          if (parsed.type) {
            batch.push({ ...parsed, _ts: Date.now() });
          }
        } catch {
          // not JSON — skip
        }
      }
    }

    if (batch.length > 0) {
      // Fire-and-forget POST to backend observability collector
      fetch(`${BACKEND}/observe/agui/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      }).catch(() => {});
    }
  } catch {
    // ignore — observability is best-effort
  }
}

export const POST = async (req: Request): Promise<Response> => {
  // Read body for session_id extraction (clone so original is not consumed)
  let sessionId = "";
  try {
    const bodyClone = req.clone();
    const body = (await bodyClone.json()) as Record<string, unknown>;
    sessionId = extractSessionId(body);
  } catch {
    // body parse failure is non-fatal for observability
  }

  const response = await handler(req);

  // Only intercept streaming responses
  if (response.body && sessionId) {
    try {
      const [clientStream, observeStream] = response.body.tee();
      // Forward observe stream in background — do NOT await
      forwardAguiEvents(observeStream, sessionId).catch(() => {});
      return new Response(clientStream, {
        status: response.status,
        headers: response.headers,
      });
    } catch {
      // Tee failed — return original response untouched
      return response;
    }
  }

  return response;
};
