"use client";

import type { PieChartProps } from "@/types/viz";
import {
  BORDER_CARD,
  BRAND_WHITE,
  CHART_COLORS,
  formatValue,
  warnIfChartPaletteOverflow,
  SECONDARY_BLACK,
  SECONDARY_IVORY,
  SECONDARY_LINK_BLUE,
  SHADOW_CARD,
  TYPO_GRAPH_LABEL,
  TYPO_GRAPH_LABEL_BOLD,
  TYPO_P1_BOLD,
  TYPO_P2_REGULAR,
} from "@/lib/theme";
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
      <path d="M6 4L10 8L6 12" stroke={SECONDARY_LINK_BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
      background: BRAND_WHITE,
      border: BORDER_CARD,
      borderRadius: 4,
      padding: "8px 12px",
      boxShadow: SHADOW_CARD,
    }}>
      <div style={{ ...TYPO_GRAPH_LABEL_BOLD, marginBottom: 4 }}>
        {entry.name}
      </div>
      <div style={TYPO_GRAPH_LABEL_BOLD}>
        {formatValue(entry.value, value_format ?? "number")}
      </div>
      {pct != null && (
        <div style={{ ...TYPO_GRAPH_LABEL, marginTop: 2 }}>
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
  warnIfChartPaletteOverflow("PieChart", data.length);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const PIE_SIZE = 180;
  const outerRadius = 80;

  return (
    <div style={{
      background: SECONDARY_IVORY,
      borderRadius: 4,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      boxShadow: SHADOW_CARD,
      overflow: "hidden",
    }}>
      {/* Title — P1 Bold */}
      {title && (
        <p style={{ ...TYPO_P1_BOLD, margin: 0 }}>
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
                    ...TYPO_GRAPH_LABEL,
                    color: SECONDARY_BLACK,
                    lineHeight: "14px",
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
                  color: SECONDARY_BLACK,
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

      {/* Footer — View Details link, P2 Regular in link blue */}
      <div style={{
        borderTop: BORDER_CARD,
        paddingTop: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ ...TYPO_P2_REGULAR, color: SECONDARY_LINK_BLUE }}>
          View Details
        </span>
        <ChevronRight />
      </div>
    </div>
  );
}
