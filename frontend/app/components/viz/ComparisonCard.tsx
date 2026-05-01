"use client";

import type { ComparisonCardProps, DeltaDirection } from "@/types/viz";
import {
  BACKFILL_GREEN,
  BORDER_CARD,
  BORDER_CHART_GRID,
  BRAND_RED,
  formatValue,
  SECONDARY_DARK_GREY,
  SECONDARY_LIGHT_GREY,
  SEMANTIC_SUCCESS,
  SHADOW_CARD,
  TYPO_GRAPH_LABEL,
  TYPO_P1_BOLD,
  TYPO_P1_REGULAR,
} from "@/lib/theme";

// Matches KPICard direction colors exactly
const DIRECTION_COLORS: Record<DeltaDirection, string> = {
  up:   SEMANTIC_SUCCESS,
  down: BRAND_RED,
  flat: SECONDARY_DARK_GREY,
};

// Reused from KPICard — chevron rotated by direction
function DirectionArrow({ direction, color }: { direction: DeltaDirection; color: string }) {
  const rotate = direction === "up" ? -90 : direction === "down" ? 90 : 0;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ transform: `rotate(${rotate}deg)`, flexShrink: 0 }}
    >
      <path d="M6 4L10 8L6 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Comparison bar — track uses chart grid color
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: BORDER_CHART_GRID, borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color,
        borderRadius: 2,
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
  const dirColor = DIRECTION_COLORS[dir];
  const maxVal = Math.max(current.value, prior.value) || 1;
  const currentPct = (current.value / maxVal) * 100;
  const priorPct   = (prior.value / maxVal) * 100;

  const deltaText = delta.type === "percentage"
    ? `${Math.abs(delta.value).toFixed(1)}%`
    : formatValue(Math.abs(delta.value), value_format);

  return (
    <div style={{
      background: BACKFILL_GREEN,
      borderRadius: 4,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxShadow: SHADOW_CARD,
      minWidth: 0,
      overflow: "hidden",
    }}>
      {/* Title — P1 Bold (matches KPICard) */}
      <p style={{ ...TYPO_P1_BOLD, margin: 0 }}>
        {title}
      </p>

      {/* Metric label — Graph Label */}
      <p style={{ ...TYPO_GRAPH_LABEL, lineHeight: "14px", margin: 0 }}>
        {metric}{unit ? ` (${unit})` : ""}
      </p>

      {/* Delta row — DirectionArrow + value (matches KPICard delta style) */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <DirectionArrow direction={dir} color={dirColor} />
        <span style={{
          fontSize: 20,
          fontWeight: 700,
          color: dirColor,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}>
          {deltaText}
        </span>
        {delta.label && (
          <span style={{
            ...TYPO_GRAPH_LABEL,
            color: dirColor,
            lineHeight: "14px",
            marginLeft: 2,
          }}>
            {delta.label}
          </span>
        )}
      </div>

      {/* Current period */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={TYPO_GRAPH_LABEL}>
            {current.label}
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, color: dirColor, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {formatValue(current.value, value_format)}
          </span>
        </div>
        <Bar pct={currentPct} color={dirColor} />
      </div>

      {/* Prior period */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={TYPO_GRAPH_LABEL}>
            {prior.label}
          </span>
          <span style={{ ...TYPO_P1_REGULAR, color: SECONDARY_DARK_GREY }}>
            {formatValue(prior.value, value_format)}
          </span>
        </div>
        <Bar pct={priorPct} color={SECONDARY_LIGHT_GREY} />
      </div>

      {/* Metric-level insight — Graph Label */}
      {insight && (
        <p style={{
          ...TYPO_GRAPH_LABEL,
          lineHeight: "14px",
          margin: 0,
          paddingTop: 8,
          borderTop: BORDER_CARD,
        }}>
          {insight}
        </p>
      )}
    </div>
  );
}
