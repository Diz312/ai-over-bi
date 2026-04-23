"use client";

import type { AreaChartProps } from "@/types/viz";
import { formatValue, makeTick, detectCategoryKey } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chartColors";
import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function CustomTooltip({ active, payload, label, value_format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0F172A",
      border: "none",
      borderRadius: 8,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    }}>
      <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6, fontWeight: 600 }}>{label}</div>
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

export function AreaChart({
  title,
  data,
  series,
  value_format = "number",
  stacked = false,
  x_axis_label,
}: AreaChartProps) {
  const tickFmt = makeTick(value_format);
  const categoryKey = detectCategoryKey(data as any[]);

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

      <ResponsiveContainer width="100%" height={300}>
        <ReAreaChart data={data} margin={{ top: 4, right: 24, bottom: 36, left: 4 }}>
          <defs>
            {series.map((s, idx) => {
              const color = s.color ?? CHART_COLORS[idx % CHART_COLORS.length];
              return (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey={categoryKey} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} height={40} />
          <YAxis tickFormatter={tickFmt} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={<CustomTooltip value_format={value_format} />} />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />
          )}
          {series.map((s, idx) => {
            const color = s.color ?? CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                stackId={stacked ? "stack" : undefined}
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            );
          })}
        </ReAreaChart>
      </ResponsiveContainer>

      {x_axis_label && (
        <div style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{x_axis_label}</div>
      )}
    </div>
  );
}
