"use client";

import type { InsightBannerProps, InsightItem } from "@/types/viz";
import {
  ACCENT_LIGHT_BLUE,
  BACKFILL_BLUE,
  BACKFILL_GREEN,
  BACKFILL_RED,
  BRAND_GREEN,
  BRAND_RED,
  TYPO_P2_BOLD,
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

// ── Individual insight card (compact — fits 2×2 grid) ────────────────────────

function InsightCard({ item }: { item: InsightItem }) {
  const { background, border } = SENTIMENT[item.sentiment ?? "neutral"];
  return (
    <div style={{
      background,
      border: `0.4px solid ${border}`,
      borderRadius: 4,
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
    }}>
      <p style={{ ...TYPO_P2_BOLD, margin: 0 }}>
        {item.headline}
      </p>
      <p style={{ ...TYPO_P2_REGULAR, margin: 0 }}>
        {item.body}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
// 2-column grid by default. With odd insight counts the last card naturally
// occupies a single grid cell on its own row. Single-insight banners collapse
// to a one-column layout via auto-fit.

export function InsightBanner({ insights }: InsightBannerProps) {
  if (!insights?.length) return null;
  const cols = insights.length === 1 ? "1fr" : "1fr 1fr";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: cols,
      gap: 16,
    }}>
      {insights.map((item, i) => (
        <InsightCard key={i} item={item} />
      ))}
    </div>
  );
}
