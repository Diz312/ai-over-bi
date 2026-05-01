"use client";

import type { InsightBannerProps, InsightItem } from "@/types/viz";
import {
  ACCENT_LIGHT_BLUE,
  BACKFILL_BLUE,
  BACKFILL_GREEN,
  BACKFILL_RED,
  BORDER_CARD,
  BRAND_GREEN,
  BRAND_RED,
  BRAND_WHITE,
  SECONDARY_BLACK,
  TYPO_P1_BOLD,
  TYPO_P1_REGULAR,
  TYPO_P2_REGULAR,
} from "@/lib/theme";

// ── Sentiment → Figma design tokens ──────────────────────────────────────────
// positive: Backfill Green + McDonald's Green border
// negative: Backfill Red   + McDonald's Red border
// neutral:  Backfill Blue  + Accent Light Blue border

const SENTIMENT: Record<InsightItem["sentiment"], { background: string; border: string }> = {
  positive: { background: BACKFILL_GREEN, border: BRAND_GREEN },
  negative: { background: BACKFILL_RED,   border: BRAND_RED },
  neutral:  { background: BACKFILL_BLUE,  border: ACCENT_LIGHT_BLUE },
};

// ── Individual insight card ───────────────────────────────────────────────────

function InsightCard({ item }: { item: InsightItem }) {
  const { background, border } = SENTIMENT[item.sentiment ?? "neutral"];
  return (
    <div style={{
      background,
      border: `0.4px solid ${border}`,
      borderRadius: 4,
      padding: "10px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 5,
    }}>
      {/* Headline — P1 Bold */}
      <p style={{ ...TYPO_P1_BOLD, margin: 0 }}>
        {item.headline}
      </p>

      {/* Body + why + source */}
      <div>
        {/* Body — P1 Regular */}
        <p style={{ ...TYPO_P1_REGULAR, margin: 0, marginBottom: 16 }}>
          {item.body}
        </p>

        {/* Why this matters — P2 Regular */}
        {item.why && (
          <p style={{ ...TYPO_P2_REGULAR, margin: 0, marginBottom: 16 }}>
            {item.why}
          </p>
        )}

        {/* Source line — 10px Regular ALL CAPS (one-off, no shared token) */}
        <p style={{
          fontSize: 10,
          fontWeight: 400,
          color: SECONDARY_BLACK,
          lineHeight: "12px",
          letterSpacing: "-0.1875px",
          margin: 0,
          textTransform: "uppercase",
        }}>
          SOURCE: AI ANALYTICS ENGINE
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InsightBanner({ insights }: InsightBannerProps) {
  if (!insights?.length) return null;
  return (
    <div style={{
      background: BRAND_WHITE,
      border: BORDER_CARD,
      borderRadius: 4,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {insights.map((item, i) => (
        <InsightCard key={i} item={item} />
      ))}
    </div>
  );
}
