/**
 * Canonical TypeScript types for AI over BI agent state.
 *
 * MUST mirror agent/src/ai_over_bi/contracts.py (AgentState) exactly.
 * Any change to the Python model requires a matching change here.
 *
 * Visualizations and insight are NOT in AgentState — they flow as A2UI
 * surfaces via tool results, not via STATE_SNAPSHOT.
 */

export type Status =
  | "idle"
  | "thinking"
  | "querying"
  | "analyzing"
  | "ready"
  | "error";

export interface AgentState {
  status: Status;
  session_id: string | null;
  error: string | null;
}
