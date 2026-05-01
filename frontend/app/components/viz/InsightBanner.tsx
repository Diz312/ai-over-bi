"use client";

import type { InsightBannerProps, InsightItem } from "@/types/viz";

// ── Sentiment → Figma design tokens ──────────────────────────────────────────
// positive: Backfill Green #F4F7F5 + McDonald's Green border #264F36
// negative: Backfill Red   #FDF2F2 + McDonald's Red border  #D90007
// neutral:  Backfill Blue  rgba(56AFD1, 10%) over white + Light Blue border #A0D8ED

const SENTIMENT: Record<InsightItem["sentiment"], { background: string; border: string }> = {
  positive: { background: "#F4F7F5",                   border: "#264F36" },
  negative: { background: "#FDF2F2",                   border: "#D90007" },
  neutral:  { background: "rgba(86, 175, 209, 0.1)",   border: "#A0D8ED" },
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
      {/* Headline — P1 Bold: 16px Bold #292929 lh 20px ls -0.15px */}
      <p style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#292929",
        lineHeight: "20px",
        letterSpacing: "-0.15px",
        margin: 0,
      }}>
        {item.headline}
      </p>

      {/* Body + why + source */}
      <div>
        {/* Body — P1: 16px Regular #292929 lh 20px ls -0.15px */}
        <p style={{
          fontSize: 16,
          fontWeight: 400,
          color: "#292929",
          lineHeight: "20px",
          letterSpacing: "-0.15px",
          margin: 0,
          marginBottom: 16,
        }}>
          {item.body}
        </p>

        {/* Why this matters — P2: 14px Regular #292929 lh 16px ls -0.1875px */}
        {item.why && (
          <p style={{
            fontSize: 14,
            fontWeight: 400,
            color: "#292929",
            lineHeight: "16px",
            letterSpacing: "-0.1875px",
            margin: 0,
            marginBottom: 16,
          }}>
            {item.why}
          </p>
        )}

        {/* Source line — 10px Regular #292929 lh 12px ls -0.1875px ALL CAPS */}
        <p style={{
          fontSize: 10,
          fontWeight: 400,
          color: "#292929",
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
      background: "#FFFFFF",
      border: "1px solid #D6D6D6",
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
