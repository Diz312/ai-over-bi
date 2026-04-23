/**
 * Canonical TypeScript types for AI over BI agent state.
 *
 * MUST mirror agent/src/ai_over_bi/contracts.py (AgentState) exactly.
 * Any change to the Python model requires a matching change here.
 */

import type { VizPayload } from "./viz";

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
  visualizations: VizPayload[];
  insight: string | null;
  error: string | null;
}
