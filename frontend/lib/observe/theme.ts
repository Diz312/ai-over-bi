/**
 * Observe page visual tokens — single source of truth.
 * All node components import from here. Reskin = edit this file only.
 */

// ---------------------------------------------------------------------------
// Status colours
// ---------------------------------------------------------------------------

export const STATUS_IDLE    = "#E5E7EB";  // gray-200
export const STATUS_RUNNING = "#3B82F6";  // blue-500
export const STATUS_DONE    = "#22C55E";  // green-500
export const STATUS_ERROR   = "#EF4444";  // red-500

export const STATUS_RING_WIDTH = 3; // px

// ---------------------------------------------------------------------------
// Node type accent colours
// ---------------------------------------------------------------------------

export const NODE_AGENT_ACCENT   = "#6366F1"; // indigo-500
export const NODE_TOOL_ACCENT    = "#F59E0B"; // amber-500
export const NODE_CONTEXT_ACCENT: Record<string, string> = {
  system_prompt: "#8B5CF6",  // violet-500
  shared_rules:  "#06B6D4",  // cyan-500
  catalog:       "#10B981",  // emerald-500
};

// ---------------------------------------------------------------------------
// Node dimensions
// ---------------------------------------------------------------------------

export const NODE_AGENT_W   = 200;
export const NODE_AGENT_H   = 80;
export const NODE_TOOL_W    = 160;
export const NODE_TOOL_H    = 60;
export const NODE_CONTEXT_W = 160;
export const NODE_CONTEXT_H = 56;

// ---------------------------------------------------------------------------
// Node card styles
// ---------------------------------------------------------------------------

export const NODE_BG          = "#FFFFFF";
export const NODE_BORDER      = "1px solid #E5E7EB";
export const NODE_RADIUS      = 8;
export const NODE_SHADOW      = "0 1px 4px rgba(0,0,0,0.10)";
export const NODE_FONT_FAMILY = "system-ui, sans-serif";

// ---------------------------------------------------------------------------
// Edge styles
// ---------------------------------------------------------------------------

export const EDGE_STATIC_COLOR   = "#D1D5DB";  // gray-300  (context → agent)
export const EDGE_ACTIVE_COLOR   = "#6366F1";  // indigo-500 (agent → agent, animated)
export const EDGE_TOOL_COLOR     = "#F59E0B";  // amber-500 (agent → tool, animated)
export const EDGE_INACTIVE_COLOR = "#E5E7EB";  // gray-200  (unvisited agent → tool)

export const EDGE_STROKE_WIDTH        = 2;
export const EDGE_ANIMATED_DASH       = "5 5";

// ---------------------------------------------------------------------------
// Panel & layout
// ---------------------------------------------------------------------------

export const SIDEBAR_WIDTH  = 280; // px
export const DETAIL_WIDTH   = 320; // px
export const SUMMARY_HEIGHT = 44;  // px
export const INPUT_HEIGHT   = 60;  // px
export const WATERFALL_H    = 160; // px (collapsed = 36px)
export const EVENTLOG_H     = 200; // px (collapsed = 36px)

export const PANEL_BG       = "#F9FAFB";  // gray-50
export const PANEL_BORDER   = "#E5E7EB";  // gray-200
export const CANVAS_BG      = "#F3F4F6";  // gray-100

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const FONT_XS  = "11px";
export const FONT_SM  = "12px";
export const FONT_MD  = "13px";
export const FONT_LG  = "14px";
export const FONT_XL  = "15px";

export const COLOR_TEXT_PRIMARY   = "#111827";  // gray-900
export const COLOR_TEXT_SECONDARY = "#6B7280";  // gray-500
export const COLOR_TEXT_MUTED     = "#9CA3AF";  // gray-400

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const BADGE_RADIUS = 4;

/** Map agent status to ring/border colour. */
export function statusColor(status: "idle" | "running" | "done" | "error"): string {
  switch (status) {
    case "running": return STATUS_RUNNING;
    case "done":    return STATUS_DONE;
    case "error":   return STATUS_ERROR;
    default:        return STATUS_IDLE;
  }
}

/** Format cost as $0.00000 */
export function formatCost(usd: number): string {
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01)  return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}

/** Format elapsed ms as human string */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Format token count */
export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
