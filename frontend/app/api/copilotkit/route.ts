import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// AnthropicAdapter handles peripheral ops (suggestions, CopilotTask, etc.)
// All agent reasoning happens in the ADK backend.
const serviceAdapter = new AnthropicAdapter({
  anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  model: "claude-haiku-4-5-20251001",
});

const runtime = new CopilotRuntime({
  agents: {
    ai_over_bi: new HttpAgent({ url: "http://localhost:8000/agent" }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
