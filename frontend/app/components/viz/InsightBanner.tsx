"use client";

/**
 * InsightBanner — top-level analyst narrative.
 *
 * Rendered as the first child of every BI surface (when an insight is present).
 * The agent emits this via the InsightBanner component in the A2UI surface tree.
 */

interface InsightBannerProps {
  text: string;
}

export function InsightBanner({ text }: InsightBannerProps) {
  return (
    <div style={{
      background: "#FFF8E7",
      border: "1px solid #FFE082",
      borderRadius: 10,
      padding: "14px 18px",
      marginBottom: 4,
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: "#FFBC0D",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
      }}>
        <AnalystIcon />
      </div>
      <div>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#7A5200",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}>
          Analyst Insight
        </div>
        <p style={{ fontSize: 13, color: "#3D2B00", lineHeight: 1.65, margin: 0 }}>
          {text}
        </p>
      </div>
    </div>
  );
}

function AnalystIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="5" r="2.5" stroke="white" strokeWidth="1.5" />
      <path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
