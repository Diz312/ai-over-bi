/**
 * Effect tokens — shadows, border shorthands, and other reusable visual
 * primitives that aren't pure colors or pure typography.
 *
 * Spread or reference these as string values:
 *   style={{ boxShadow: SHADOW_CARD, border: BORDER_CARD }}
 */

import { BORDER_CHART_GRID, SECONDARY_LIGHT_GREY } from "./colors";

// ── Shadows ───────────────────────────────────────────────────────────────────

/** Standard card shadow — used by every viz card wrapper. */
export const SHADOW_CARD = "0px 1px 10px 0px rgba(0,0,0,0.08)";

// ── Border shorthands ─────────────────────────────────────────────────────────

/** Standard 1px card border using SECONDARY_LIGHT_GREY. */
export const BORDER_CARD = `1px solid ${SECONDARY_LIGHT_GREY}`;

/** Lighter 1px border for chart grid lines and axis lines. */
export const BORDER_GRID = `1px solid ${BORDER_CHART_GRID}`;
