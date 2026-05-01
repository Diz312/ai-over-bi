"use client";

import type { KPICardProps, TrendPoint, DeltaDirection } from "@/types/viz";
import { formatValue } from "@/lib/format";
import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";

const DIRECTION_COLORS = {
  up:   "#1F6437",
  down: "#DA291C",
  flat: "#6B6B6B",
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
      <path d="M6 4L10 8L6 12" stroke="#006BAE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Sparkline({ data }: { data: TrendPoint[] }) {
  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const color = isPositive ? "#1F6437" : "#DA291C";
  const PER_POINT = 34;
  const innerWidth = Math.max(200, data.length * PER_POINT);
  return (
    <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}>
      <div style={{ width: innerWidth, height: 64 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, bottom: 4, left: 4, right: 8 }}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: 9, fill: "#94A3B8" }}
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
  const valueColor = delta ? DIRECTION_COLORS[dir] : "#292929";

  const deltaText = delta
    ? delta.type === "percentage"
      ? `${Math.abs(delta.value).toFixed(1)}%`
      : formatValue(Math.abs(delta.value), value_format)
    : null;

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
      {/* Title */}
      <p style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#292929",
        letterSpacing: "-0.15px",
        lineHeight: "20px",
        margin: 0,
        width: "100%",
      }}>
        {title}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, justifyContent: "flex-end" }}>
        {/* Primary value */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: valueColor, lineHeight: 1, whiteSpace: "nowrap" }}>
            {formatted}
          </span>
          {unit && value_format === "raw" && (
            <span style={{ fontSize: 13, color: "#6B6B6B", fontWeight: 400 }}>{unit}</span>
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

        {/* Subtitle */}
        {subtitle && (
          <div style={{ fontSize: 11, color: "#6B6B6B", marginTop: 2 }}>{subtitle}</div>
        )}

        {/* View Trend link */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 4,
          overflow: "hidden",
        }}>
          <span style={{
            fontSize: 14,
            fontWeight: 400,
            color: "#006BAE",
            lineHeight: "16px",
            letterSpacing: "-0.15px",
            whiteSpace: "nowrap",
          }}>
            View Trend
          </span>
          <ChevronRight />
        </div>
      </div>
    </div>
  );
}
