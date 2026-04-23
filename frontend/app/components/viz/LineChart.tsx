"use client";

import type { LineChartProps } from "@/types/viz";
import { formatValue, makeTick, detectCategoryKey } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chartColors";
import {
  LineChart as ReLineChart,
  Line,
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
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#CBD5E1" }}>{entry.name}</span>
          <span style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 700, marginLeft: "auto" }}>
            {formatValue(entry.value, value_format)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  title,
  data,
  series,
  value_format = "number",
  show_dots = true,
  x_axis_label,
  y_axis_label,
}: LineChartProps) {
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
        <ReLineChart data={data} margin={{ top: 4, right: 24, bottom: 36, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey={categoryKey} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} height={40} />
          <YAxis tickFormatter={tickFmt} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={<CustomTooltip value_format={value_format} />} />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />
          )}
          {series.map((s, idx) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={2}
              dot={show_dots ? { r: 3, fill: s.color ?? CHART_COLORS[idx % CHART_COLORS.length], strokeWidth: 0 } : false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </ReLineChart>
      </ResponsiveContainer>

      {x_axis_label && (
        <div style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{x_axis_label}</div>
      )}
    </div>
  );
}
