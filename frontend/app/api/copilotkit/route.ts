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

export const POST = (req: Request) => handler(req);
