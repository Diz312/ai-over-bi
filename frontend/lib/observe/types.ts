// Observability types — mirrors of Python dataclasses in observability.py

export type SpanType = "agent" | "llm" | "tool";

export interface Span {
  span_id: string;
  type: SpanType;
  agent_name: string;
  model: string | null;
  started_at: number;       // unix timestamp (seconds)
  ended_at: number | null;
  elapsed_ms: number | null;

  // LLM metrics
  tokens_in: number;
  tokens_out: number;
  tokens_cached: number;
  tokens_thinking: number;
  assembled_prompt: string | null;
  thinking_text: string | null;
  context_utilization_pct: number | null;

  // Tool metrics
  tool_name: string | null;
  tool_args: Record<string, unknown> | null;
  tool_result: unknown | null;

  // Error
  error: string | null;
  cost_usd: number;
}

export interface TurnSummary {
  turn_id: string;
  session_id: string;
  question: string;
  started_at: number;
  elapsed_ms: number | null;
  ttft_ms: number | null;
  total_cost: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_tokens_cached: number;
  cache_savings_usd: number;
  agents_invoked: string[];
  error: string | null;
}

export interface TurnDetail extends TurnSummary {
  ended_at: number | null;
  spans: Span[];
  agui_events: AgUIEvent[];
}

export interface AgUIEvent {
  type: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface SessionTotals {
  turn_count: number;
  total_cost_usd: number;
  avg_cost_usd: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cache_savings_usd: number;
}

export interface StaticTokens {
  "orchestrator.md": number;
  "data_query.md": number;
  "analyst.md": number;
  "_metric_display_rules.md": number;
  viz_catalog: number;
  [key: string]: number;
}

// SSE event payloads
export type ObserveEventType =
  | "turn_start"
  | "turn_complete"
  | "span_start"
  | "span_end"
  | "agui_event";

export interface ObserveEvent {
  type: ObserveEventType;
  span?: Span;
  turn?: TurnSummary | TurnDetail;
  event?: AgUIEvent;
}

// Node states for React Flow
export type NodeStatus = "idle" | "running" | "done" | "error";

export interface AgentNodeData {
  label: string;
  agentName: string;
  model: string;
  status: NodeStatus;
  // per-turn metrics (populated when a span ends)
  tokensIn?: number;
  tokensOut?: number;
  tokensCached?: number;
  costUsd?: number;
  elapsedMs?: number;
  ttftMs?: number;
  contextUtilizationPct?: number;
  error?: string;
}

export interface ToolNodeData {
  label: string;
  toolName: string;
  status: NodeStatus;
  elapsedMs?: number;
  error?: string;
}

export interface ContextSourceNodeData {
  label: string;
  fileName: string;
  nodeType: "system_prompt" | "shared_rules" | "catalog";
  staticTokens: number;
}
