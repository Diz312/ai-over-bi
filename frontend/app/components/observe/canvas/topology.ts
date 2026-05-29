/**
 * Static topology for the observe React Flow canvas.
 *
 * Node IDs deliberately match the agent names and tool names used by the ADK agents,
 * so that span events can be mapped directly to nodes by ID.
 *
 * Layout:
 *   Row 0 (y=0):   Context source nodes
 *   Row 1 (y=160): Agent nodes
 *   Row 2 (y=320): Tool nodes
 */

import type { Edge, Node } from "@xyflow/react";
import type {
  AgentNodeData,
  ContextSourceNodeData,
  ToolNodeData,
} from "../../../../lib/observe/types";
import {
  EDGE_ACTIVE_COLOR,
  EDGE_INACTIVE_COLOR,
  EDGE_STATIC_COLOR,
  EDGE_STROKE_WIDTH,
} from "../../../../lib/observe/theme";

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export const INITIAL_NODES: Node[] = [
  // ── Context source nodes ──────────────────────────────────────────────
  {
    id: "ctx_orchestrator_md",
    type: "contextSourceNode",
    position: { x: 60, y: 0 },
    data: {
      label: "orchestrator.md",
      fileName: "orchestrator.md",
      nodeType: "system_prompt",
      staticTokens: 0,
    } satisfies ContextSourceNodeData,
  },
  {
    id: "ctx_data_query_md",
    type: "contextSourceNode",
    position: { x: 280, y: 0 },
    data: {
      label: "data_query.md",
      fileName: "data_query.md",
      nodeType: "system_prompt",
      staticTokens: 0,
    } satisfies ContextSourceNodeData,
  },
  {
    id: "ctx_analyst_md",
    type: "contextSourceNode",
    position: { x: 500, y: 0 },
    data: {
      label: "analyst.md",
      fileName: "analyst.md",
      nodeType: "system_prompt",
      staticTokens: 0,
    } satisfies ContextSourceNodeData,
  },
  {
    id: "ctx_metric_rules",
    type: "contextSourceNode",
    position: { x: 720, y: 0 },
    data: {
      label: "_metric_display_rules.md",
      fileName: "_metric_display_rules.md",
      nodeType: "shared_rules",
      staticTokens: 0,
    } satisfies ContextSourceNodeData,
  },
  {
    id: "ctx_viz_catalog",
    type: "contextSourceNode",
    position: { x: 940, y: 0 },
    data: {
      label: "viz_catalog",
      fileName: "viz_catalog",
      nodeType: "catalog",
      staticTokens: 0,
    } satisfies ContextSourceNodeData,
  },

  // ── Agent nodes ───────────────────────────────────────────────────────
  {
    id: "ai_over_bi",
    type: "agentNode",
    position: { x: 60, y: 160 },
    data: {
      label: "Orchestrator",
      agentName: "ai_over_bi",
      model: "claude-sonnet-4-6",
      status: "idle",
    } satisfies AgentNodeData,
  },
  {
    id: "data_query_agent",
    type: "agentNode",
    position: { x: 280, y: 160 },
    data: {
      label: "DataQuery Agent",
      agentName: "data_query_agent",
      model: "claude-haiku-4-5-20251001",
      status: "idle",
    } satisfies AgentNodeData,
  },
  {
    id: "analyst_agent",
    type: "agentNode",
    position: { x: 540, y: 160 },
    data: {
      label: "Analyst Agent",
      agentName: "analyst_agent",
      model: "claude-sonnet-4-6",
      status: "idle",
    } satisfies AgentNodeData,
  },

  // ── Tool nodes ────────────────────────────────────────────────────────
  {
    id: "query_daily_sales",
    type: "toolNode",
    position: { x: 160, y: 320 },
    data: {
      label: "query_daily_sales",
      toolName: "query_daily_sales",
      status: "idle",
    } satisfies ToolNodeData,
  },
  {
    id: "query_quarterly_sales",
    type: "toolNode",
    position: { x: 340, y: 320 },
    data: {
      label: "query_quarterly_sales",
      toolName: "query_quarterly_sales",
      status: "idle",
    } satisfies ToolNodeData,
  },
  {
    id: "compare_periods",
    type: "toolNode",
    position: { x: 520, y: 320 },
    data: {
      label: "compare_periods",
      toolName: "compare_periods",
      status: "idle",
    } satisfies ToolNodeData,
  },
  {
    id: "get_industry_context",
    type: "toolNode",
    position: { x: 700, y: 320 },
    data: {
      label: "get_industry_context",
      toolName: "get_industry_context",
      status: "idle",
    } satisfies ToolNodeData,
  },
  {
    id: "render_surface",
    type: "toolNode",
    position: { x: 880, y: 320 },
    data: {
      label: "render_surface",
      toolName: "render_surface",
      status: "idle",
    } satisfies ToolNodeData,
  },
];

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

const staticEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  type: "smoothstep",
  style: { stroke: EDGE_STATIC_COLOR, strokeWidth: EDGE_STROKE_WIDTH },
  animated: false,
});

const agentEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  type: "smoothstep",
  style: { stroke: EDGE_INACTIVE_COLOR, strokeWidth: EDGE_STROKE_WIDTH },
  animated: false,
  data: { type: "agent" },
});

const toolEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  type: "smoothstep",
  style: { stroke: EDGE_INACTIVE_COLOR, strokeWidth: EDGE_STROKE_WIDTH },
  animated: false,
  data: { type: "tool" },
});

export const INITIAL_EDGES: Edge[] = [
  // Context sources → agents
  staticEdge("e_ctx_orch", "ctx_orchestrator_md", "ai_over_bi"),
  staticEdge("e_ctx_dq", "ctx_data_query_md", "data_query_agent"),
  staticEdge("e_ctx_an", "ctx_analyst_md", "analyst_agent"),
  staticEdge("e_ctx_rules_dq", "ctx_metric_rules", "data_query_agent"),
  staticEdge("e_ctx_rules_an", "ctx_metric_rules", "analyst_agent"),
  staticEdge("e_ctx_cat_dq", "ctx_viz_catalog", "data_query_agent"),
  staticEdge("e_ctx_cat_an", "ctx_viz_catalog", "analyst_agent"),

  // Orchestrator → sub-agents
  agentEdge("e_orch_dq", "ai_over_bi", "data_query_agent"),
  agentEdge("e_orch_an", "ai_over_bi", "analyst_agent"),

  // DataQueryAgent → tools
  toolEdge("e_dq_daily", "data_query_agent", "query_daily_sales"),
  toolEdge("e_dq_quarterly", "data_query_agent", "query_quarterly_sales"),
  toolEdge("e_dq_render", "data_query_agent", "render_surface"),

  // AnalystAgent → tools
  toolEdge("e_an_compare", "analyst_agent", "compare_periods"),
  toolEdge("e_an_industry", "analyst_agent", "get_industry_context"),
  toolEdge("e_an_render", "analyst_agent", "render_surface"),
];

/** Agent name → list of tool node IDs it owns */
export const AGENT_TOOL_MAP: Record<string, string[]> = {
  data_query_agent: ["query_daily_sales", "query_quarterly_sales", "render_surface"],
  analyst_agent: ["compare_periods", "get_industry_context", "render_surface"],
};

/** Edge IDs that connect agent → tool, keyed by tool node ID */
export const TOOL_EDGE_IDS: Record<string, string[]> = {
  query_daily_sales:     ["e_dq_daily"],
  query_quarterly_sales: ["e_dq_quarterly"],
  render_surface:        ["e_dq_render", "e_an_render"],
  compare_periods:       ["e_an_compare"],
  get_industry_context:  ["e_an_industry"],
};

/** Edge IDs for agent → agent */
export const AGENT_EDGE_IDS: Record<string, string> = {
  data_query_agent: "e_orch_dq",
  analyst_agent: "e_orch_an",
};
