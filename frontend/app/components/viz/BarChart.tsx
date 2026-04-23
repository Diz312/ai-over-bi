"use client";

import type { BarChartProps } from "@/types/viz";
import { formatValue, makeTick } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chartColors";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function CustomTooltip({ active, payload, label, isHorizontal, value_format }: any) {
  if (!active || !payload?.length) return null;
  const header = isHorizontal ? (payload[0]?.payload?.label ?? label) : label;
  return (
    <div style={{
      background: "#0F172A",
      border: "none",
      borderRadius: 8,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    }}>
      <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6, fontWeight: 600 }}>{header}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#CBD5E1" }}>{entry.name}</span>
          <span style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 700, marginLeft: "auto" }}>
            {formatValue(entry.value, value_format)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BarChart({
  title,
  data,
  series,
  layout = "vertical",
  value_format = "number",
  x_axis_label,
  y_axis_label,
}: BarChartProps) {
  const isHorizontal = layout === "horizontal";
  const height = isHorizontal ? Math.max(300, data.length * 36 + 80) : 320;
  const tickFmt = makeTick(value_format);

  // Dynamic Y axis width for horizontal bars based on longest label
  const maxLabelLen = isHorizontal
    ? Math.max(...data.map(d => String(d.label ?? "").length), 4)
    : 0;
  const yAxisWidth = isHorizontal ? Math.min(180, Math.max(80, maxLabelLen * 7)) : 56;

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 12,
      border: "1px solid #E2E8F0",
      padding: "20px 24px 16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      {title && (
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16, letterSpacing: "-0.01em" }}>
          {title}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ReBarChart
          data={data}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{
            top: 4,
            right: 32,
            bottom: isHorizontal ? 8 : 36,
            left: 4,
          }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#F1F5F9"
            horizontal={!isHorizontal}
            vertical={isHorizontal}
          />

          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                tickFormatter={tickFmt}
                tick={{ fontSize: 11, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: "#334155" }}
                axisLine={false}
                tickLine={false}
                width={yAxisWidth}
                interval={0}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={40}
              />
              <YAxis
                tickFormatter={tickFmt}
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                width={yAxisWidth}
              />
            </>
          )}

          <Tooltip
            content={<CustomTooltip value_format={value_format} isHorizontal={isHorizontal} />}
            cursor={{ fill: "#F8FAFC" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />

          {series.map((s, idx) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color ?? CHART_COLORS[idx % CHART_COLORS.length]}
              radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={isHorizontal ? 24 : 48}
            />
          ))}
        </ReBarChart>
      </ResponsiveContainer>

      {x_axis_label && (
        <div style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{x_axis_label}</div>
      )}
      {y_axis_label && isHorizontal && (
        <div style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{y_axis_label}</div>
      )}
    </div>
  );
}
