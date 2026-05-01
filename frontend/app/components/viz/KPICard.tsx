"use client";

import type { KPICardProps, TrendPoint, DeltaDirection } from "@/types/viz";
import {
  BACKFILL_GREEN,
  BRAND_RED,
  formatValue,
  SECONDARY_BLACK,
  SECONDARY_DARK_GREY,
  SECONDARY_LINK_BLUE,
  SEMANTIC_SUCCESS,
  SHADOW_CARD,
  TYPO_GRAPH_LABEL,
  TYPO_P1_BOLD,
  TYPO_P2_REGULAR,
} from "@/lib/theme";
import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";

const DIRECTION_COLORS = {
  up:   SEMANTIC_SUCCESS,
  down: BRAND_RED,
  flat: SECONDARY_DARK_GREY,
};

// Chevron pointing right; rotated via CSS to indicate direction
function DirectionArrow({ direction, color }: { direction: DeltaDirection; color: string }) {
  const rotate = direction === "up" ? -90 : direction === "down" ? 90 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, flexShrink: 0 }}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        style={{ transform: `rotate(${rotate}deg)`, transition: "transform 0.1s" }}
      >
        <path d="M6 4L10 8L6 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6 4L10 8L6 12" stroke={SECONDARY_LINK_BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Sparkline({ data }: { data: TrendPoint[] }) {
  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const color = isPositive ? SEMANTIC_SUCCESS : BRAND_RED;
  const PER_POINT = 34;
  const innerWidth = Math.max(200, data.length * PER_POINT);
  return (
    <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}>
      <div style={{ width: innerWidth, height: 64 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, bottom: 4, left: 4, right: 8 }}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: 9, fill: SECONDARY_DARK_GREY }}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={16}
              padding={{ left: 4, right: 4 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={{ r: 2, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function KPICard({
  title,
  value,
  unit,
  value_format = "number",
  delta,
  trend,
  subtitle,
}: KPICardProps) {
  const formatted = formatValue(
    typeof value === "number" ? value : parseFloat(String(value)),
    value_format,
  );
  const dir = delta?.direction ?? "flat";
  const valueColor = delta ? DIRECTION_COLORS[dir] : SECONDARY_BLACK;

  const deltaText = delta
    ? delta.type === "percentage"
      ? `${Math.abs(delta.value).toFixed(1)}%`
      : formatValue(Math.abs(delta.value), value_format)
    : null;

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
      {/* Title — P1 Bold */}
      <p style={{ ...TYPO_P1_BOLD, margin: 0, width: "100%" }}>
        {title}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, justifyContent: "flex-end" }}>
        {/* Primary value */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: valueColor, lineHeight: 1, whiteSpace: "nowrap" }}>
            {formatted}
          </span>
          {unit && value_format === "raw" && (
            <span style={{ fontSize: 13, color: SECONDARY_DARK_GREY, fontWeight: 400 }}>{unit}</span>
          )}
        </div>

        {/* Delta row: [arrow] [value] [label] */}
        {delta && deltaText && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
            <DirectionArrow direction={dir} color={valueColor} />
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 8, color: valueColor, minWidth: 0 }}>
              <span style={{ fontSize: 28, fontWeight: 400, lineHeight: 1, whiteSpace: "nowrap" }}>
                {deltaText}
              </span>
              {delta.label && (
                <span style={{
                  fontSize: 20,
                  fontWeight: 400,
                  lineHeight: "24px",
                  letterSpacing: "-0.1875px",
                  flex: 1,
                }}>
                  {delta.label}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sparkline — rendered when trend data is supplied */}
        {trend && trend.length >= 3 && (
          <div style={{ marginTop: 2, marginBottom: 2 }}>
            <Sparkline data={trend} />
          </div>
        )}

        {/* Subtitle — Graph Label */}
        {subtitle && (
          <div style={{ ...TYPO_GRAPH_LABEL, marginTop: 2 }}>{subtitle}</div>
        )}

        {/* View Trend link — P2 Regular, link blue */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 4,
          overflow: "hidden",
        }}>
          <span style={{ ...TYPO_P2_REGULAR, color: SECONDARY_LINK_BLUE, whiteSpace: "nowrap" }}>
            View Trend
          </span>
          <ChevronRight />
        </div>
      </div>
    </div>
  );
}
