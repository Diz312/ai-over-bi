"use client";

import type { ComparisonCardProps, DeltaDirection } from "@/types/viz";
import { formatValue } from "@/lib/format";

// Matches KPICard direction colors exactly
const DIRECTION_COLORS: Record<DeltaDirection, string> = {
  up:   "#1F6437",
  down: "#DA291C",
  flat: "#6B6B6B",
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

// Comparison bar — same track color as BarChart grid (#E8E8E8)
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: "#E8E8E8", borderRadius: 2, overflow: "hidden" }}>
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
      background: "#F4F7F5",
      borderRadius: 4,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxShadow: "0px 1px 10px 0px rgba(0,0,0,0.08)",
      minWidth: 0,
      overflow: "hidden",
    }}>
      {/* Title — P1 Bold: 16px Bold #292929 lh 20px ls -0.15px (matches KPICard) */}
      <p style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#292929",
        lineHeight: "20px",
        letterSpacing: "-0.15px",
        margin: 0,
      }}>
        {title}
      </p>

      {/* Metric label — Graph Labels: 11px Regular #6F6F6F ls -0.1875px */}
      <p style={{
        fontSize: 11,
        fontWeight: 400,
        color: "#6F6F6F",
        lineHeight: "14px",
        letterSpacing: "-0.1875px",
        margin: 0,
      }}>
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
            fontSize: 11,
            fontWeight: 400,
            color: dirColor,
            lineHeight: "14px",
            letterSpacing: "-0.1875px",
            marginLeft: 2,
          }}>
            {delta.label}
          </span>
        )}
      </div>

      {/* Current period */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, fontWeight: 400, color: "#6F6F6F", letterSpacing: "-0.1875px" }}>
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
          <span style={{ fontSize: 11, fontWeight: 400, color: "#6F6F6F", letterSpacing: "-0.1875px" }}>
            {prior.label}
          </span>
          <span style={{ fontSize: 16, fontWeight: 400, color: "#6F6F6F", letterSpacing: "-0.15px", lineHeight: "20px" }}>
            {formatValue(prior.value, value_format)}
          </span>
        </div>
        <Bar pct={priorPct} color="#D6D6D6" />
      </div>

      {/* Metric-level insight — Graph Labels: 11px Regular #6F6F6F ls -0.1875px */}
      {insight && (
        <p style={{
          fontSize: 11,
          fontWeight: 400,
          color: "#6F6F6F",
          lineHeight: "14px",
          letterSpacing: "-0.1875px",
          margin: 0,
          paddingTop: 8,
          borderTop: "1px solid #D6D6D6",
        }}>
          {insight}
        </p>
      )}
    </div>
  );
}
