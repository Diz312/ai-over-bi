"use client";

import type { KPICardProps, TrendPoint } from "@/types/viz";
import { formatValue } from "@/lib/format";
import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";

const DELTA_COLORS = {
  up:   { bg: "#F0FDF4", text: "#2E7D32", border: "#A5D6A7" },
  down: { bg: "#FEF2F2", text: "#DA291C", border: "#FFCDD2" },
  flat: { bg: "#F5F5F5", text: "#6B6B6B", border: "#E2E8F0" },
};

const DELTA_ICONS = {
  up:   "▲",
  down: "▼",
  flat: "—",
};

function Sparkline({ data }: { data: TrendPoint[] }) {
  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const color = isPositive ? "#16A34A" : "#DC2626";
  // Give each point ~34px of horizontal room. If the total exceeds the card
  // width, the wrapper scrolls horizontally so every period label is readable.
  const PER_POINT = 34;
  const innerWidth = Math.max(200, data.length * PER_POINT);
  return (
    <div
      className="sparkline-scroll"
      style={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}
    >
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
  const formatted = formatValue(typeof value === "number" ? value : parseFloat(String(value)), value_format);
  const dir = delta?.direction ?? "flat";
  const deltaColors = DELTA_COLORS[dir];

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 12,
      border: "1px solid #E2E8F0",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      minWidth: 0,
    }}>
      {/* Title */}
      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {title}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {formatted}
        </span>
        {unit && value_format === "raw" && (
          <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>{unit}</span>
        )}
      </div>

      {/* Sparkline */}
      {trend && trend.length >= 3 && (
        <div style={{ marginTop: 2, marginBottom: 2 }}>
          <Sparkline data={trend} />
        </div>
      )}

      {/* Delta badge */}
      {delta && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: deltaColors.text,
            background: deltaColors.bg,
            border: `1px solid ${deltaColors.border}`,
            borderRadius: 20,
            padding: "2px 8px",
          }}>
            <span style={{ fontSize: 9 }}>{DELTA_ICONS[dir]}</span>
            {delta.type === "percentage"
              ? `${Math.abs(delta.value).toFixed(1)}%`
              : formatValue(Math.abs(delta.value), value_format)}
          </span>
          {delta.label && (
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{delta.label}</span>
          )}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}
