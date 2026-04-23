"use client";

import type { PieChartProps } from "@/types/viz";
import { formatValue } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chartColors";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function CustomTooltip({ active, payload, value_format }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div style={{
      background: "#0F172A",
      border: "none",
      borderRadius: 8,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    }}>
      <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4, fontWeight: 600 }}>
        {entry.name}
      </div>
      <div style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 700 }}>
        {formatValue(entry.value, value_format)}
      </div>
      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
        {entry.payload.percent != null ? `${(entry.payload.percent * 100).toFixed(1)}%` : ""}
      </div>
    </div>
  );
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#FFFFFF" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700, pointerEvents: "none" }}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export function PieChart({
  title,
  data,
  value_format = "number",
  show_labels = true,
  inner_radius = 0,
}: PieChartProps) {
  const outerRadius = 110;

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
        <RePieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            innerRadius={inner_radius}
            labelLine={false}
            label={show_labels ? CustomLabel : false}
            isAnimationActive={false}
          >
            {data.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={entry.color ?? CHART_COLORS[idx % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip value_format={value_format} />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: "#64748B", fontSize: 11 }}>{value}</span>
            )}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}
