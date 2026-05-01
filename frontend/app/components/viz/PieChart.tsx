"use client";

import type { PieChartProps } from "@/types/viz";
import { formatValue } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chartColors";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

// ── ChevronRight (View Details footer) ───────────────────────────────────────

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6 4L10 8L6 12" stroke="#006BAE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, value_format }: {
  active?: boolean;
  payload?: { name: string; value: number; payload?: { percent?: number } }[];
  value_format: PieChartProps["value_format"];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const pct = entry.payload?.percent;
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #D6D6D6",
      borderRadius: 4,
      padding: "8px 12px",
      boxShadow: "0px 1px 10px 0px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#292929", marginBottom: 4, letterSpacing: "-0.1875px" }}>
        {entry.name}
      </div>
      <div style={{ fontSize: 11, color: "#292929", fontWeight: 700, letterSpacing: "-0.1875px" }}>
        {formatValue(entry.value, value_format ?? "number")}
      </div>
      {pct != null && (
        <div style={{ fontSize: 11, color: "#6F6F6F", marginTop: 2, letterSpacing: "-0.1875px" }}>
          {`${(pct * 100).toFixed(1)}%`}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PieChart({
  title,
  data,
  value_format = "number",
  inner_radius = 0,
}: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const PIE_SIZE = 180;
  const outerRadius = 80;

  return (
    <div style={{
      background: "#F9F9F9",
      borderRadius: 4,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      boxShadow: "0px 1px 10px 0px rgba(0,0,0,0.08)",
      overflow: "hidden",
    }}>
      {/* Title — P1 Bold: 16px Bold #292929 lh 20px ls -0.15px */}
      {title && (
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
      )}

      {/* Donut left + Legend table right */}
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>

        {/* Pie / Donut — fixed 180×180px, no ResponsiveContainer */}
        <div style={{ flexShrink: 0, width: PIE_SIZE, height: PIE_SIZE }}>
          <RePieChart width={PIE_SIZE} height={PIE_SIZE}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx={PIE_SIZE / 2}
              cy={PIE_SIZE / 2}
              outerRadius={outerRadius}
              innerRadius={inner_radius}
              labelLine={false}
              isAnimationActive={false}
            >
              {data.map((_entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip value_format={value_format} />} />
          </RePieChart>
        </div>

        {/* Legend table — dot · label (left) · percentage Bold (right) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          {data.map((slice, idx) => {
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={slice.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "100px",
                    background: color,
                    border: `0.1px solid ${color}`,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: "#292929",
                    lineHeight: "14px",
                    letterSpacing: "-0.1875px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {slice.label}
                  </span>
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#292929",
                  lineHeight: "14px",
                  letterSpacing: "-0.1875px",
                  flexShrink: 0,
                }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — View Details link, border-top #D6D6D6, P2: 14px Regular #006BAE ls -0.15px */}
      <div style={{
        borderTop: "1px solid #D6D6D6",
        paddingTop: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 400,
          color: "#006BAE",
          lineHeight: "16px",
          letterSpacing: "-0.15px",
        }}>
          View Details
        </span>
        <ChevronRight />
      </div>
    </div>
  );
}
