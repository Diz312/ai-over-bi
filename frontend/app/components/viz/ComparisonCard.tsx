"use client";

import type { ComparisonCardProps } from "@/types/viz";
import { formatValue } from "@/lib/format";

const DELTA_COLORS = {
  up:   { bg: "#F0FDF4", text: "#2E7D32", border: "#A5D6A7", badge: "#C8E6C9" },
  down: { bg: "#FEF2F2", text: "#DA291C", border: "#FFCDD2", badge: "#FFCDD2" },
  flat: { bg: "#F5F5F5", text: "#6B6B6B", border: "#E2E8F0", badge: "#F5F5F5" },
};

const DELTA_ICONS = { up: "▲", down: "▼", flat: "—" };

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: "#F1F5F9", borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color,
        borderRadius: 2,
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

export function ComparisonCard({
  title,
  metric,
  unit,
  value_format = "number",
  current,
  prior,
  delta,
  insight,
}: ComparisonCardProps) {
  const dir = delta.direction;
  const colors = DELTA_COLORS[dir];
  const maxVal = Math.max(current.value, prior.value) || 1;
  const currentPct = (current.value / maxVal) * 100;
  const priorPct = (prior.value / maxVal) * 100;

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 12,
      border: "1px solid #E2E8F0",
      padding: "20px 24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>{metric}</div>
        </div>
        {/* Delta badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 12px",
          borderRadius: 20,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          fontSize: 13,
          fontWeight: 800,
          color: colors.text,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10 }}>{DELTA_ICONS[dir]}</span>
          {delta.type === "percentage"
            ? `${Math.abs(delta.value).toFixed(1)}%`
            : formatValue(Math.abs(delta.value), value_format)}
          {delta.label && (
            <span style={{ fontSize: 10, fontWeight: 500, color: colors.text, opacity: 0.75 }}>
              &nbsp;{delta.label}
            </span>
          )}
        </div>
      </div>

      {/* Current period */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{current.label}</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            {formatValue(current.value, value_format)}
          </span>
        </div>
        <Bar pct={currentPct} color="#FFBC0D" />
      </div>

      {/* Prior period */}
      <div style={{ marginBottom: insight ? 14 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{prior.label}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#94A3B8", letterSpacing: "-0.01em" }}>
            {formatValue(prior.value, value_format)}
          </span>
        </div>
        <Bar pct={priorPct} color="#CBD5E1" />
      </div>

      {/* Metric-level insight */}
      {insight && (
        <div style={{
          borderTop: "1px solid #F1F5F9",
          paddingTop: 12,
          fontSize: 11,
          color: "#64748B",
          lineHeight: 1.6,
          fontStyle: "italic",
        }}>
          {insight}
        </div>
      )}
    </div>
  );
}
