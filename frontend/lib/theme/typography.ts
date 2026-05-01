/**
 * Typography tokens — named style objects matching the McDonald's Digital Figma
 * typography scale. Spread these into inline style props:
 *
 *   <div style={{ ...TYPO_P1_BOLD }}>...</div>
 *
 * Adding a new typography style:
 *   1. Add the named export here with the fields that vary per use site
 *      OMITTED (e.g. don't set `marginTop` here unless every use applies it)
 *   2. Reference the constant by name in viz components
 *
 * Why CSSProperties typing matters: ensures these objects compose cleanly into
 * React's `style` prop without `any` assertions at use sites.
 */

import type { CSSProperties } from "react";

import { SECONDARY_BLACK, SECONDARY_DARK_GREY } from "./colors";

// ── P1 — body text (16px) ─────────────────────────────────────────────────────

export const TYPO_P1_BOLD: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: SECONDARY_BLACK,
  lineHeight: "20px",
  letterSpacing: "-0.15px",
};

export const TYPO_P1_REGULAR: CSSProperties = {
  fontSize: 16,
  fontWeight: 400,
  color: SECONDARY_BLACK,
  lineHeight: "20px",
  letterSpacing: "-0.15px",
};

// ── P2 — secondary body text (14px) ───────────────────────────────────────────

export const TYPO_P2_BOLD: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: SECONDARY_BLACK,
  lineHeight: "16px",
  letterSpacing: "-0.15px",
};

export const TYPO_P2_REGULAR: CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  color: SECONDARY_BLACK,
  lineHeight: "16px",
  letterSpacing: "-0.15px",
};

// ── Big Number — table metric cells (20px) ────────────────────────────────────

export const TYPO_BIG_NUMBER: CSSProperties = {
  fontSize: 20,
  fontWeight: 400,
  color: SECONDARY_BLACK,
  lineHeight: "24px",
  letterSpacing: "-0.1875px",
};

// ── Graph Labels — chart axis ticks, legend text, captions (11px) ─────────────

export const TYPO_GRAPH_LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 400,
  color: SECONDARY_DARK_GREY,
  letterSpacing: "-0.1875px",
};

export const TYPO_GRAPH_LABEL_BOLD: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: SECONDARY_BLACK,
  letterSpacing: "-0.1875px",
};
