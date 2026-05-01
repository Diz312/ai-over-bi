"use client";

import type { LineChartProps } from "@/types/viz";
import {
  BORDER_CARD,
  BORDER_CHART_GRID,
  BRAND_WHITE,
  CHART_COLORS,
  formatValue,
  makeTick,
  warnIfChartPaletteOverflow,
  SECONDARY_BLACK,
  SECONDARY_DARK_GREY,
  SHADOW_CARD,
  TYPO_GRAPH_LABEL,
  TYPO_GRAPH_LABEL_BOLD,
  TYPO_P1_BOLD,
} from "@/lib/theme";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";

const CATEGORY_KEY = "label";

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipPayload {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  value_format: LineChartProps["value_format"];
}

function CustomTooltip({ active, payload, label, value_format }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: BRAND_WHITE,
      border: BORDER_CARD,
      borderRadius: 4,
      padding: "8px 12px",
      boxShadow: SHADOW_CARD,
    }}>
      <div style={{ ...TYPO_GRAPH_LABEL_BOLD, marginBottom: 6 }}>
        {label}
      </div>
      {[...payload].reverse().map((entry) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: "100px", background: entry.color, flexShrink: 0 }} />
          <span style={TYPO_GRAPH_LABEL}>{entry.name}</span>
          <span style={{ ...TYPO_GRAPH_LABEL_BOLD, marginLeft: "auto", paddingLeft: 12 }}>
            {formatValue(entry.value, value_format ?? "number")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
// Figma: 20px × 8px line swatch (with center dot) + 4px gap + 11px Regular label.
// Items wrap with 4px row+column gap, centered.

function SeriesLegend({ series, show_dots }: { series: LineChartProps["series"]; show_dots?: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", justifyContent: "center" }}>
      {series.map((s, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden>
              <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" />
              {show_dots !== false && (
                <circle cx="10" cy="4" r="3" fill={color} />
              )}
            </svg>
            <span style={{
              ...TYPO_GRAPH_LABEL,
              color: SECONDARY_BLACK,
              lineHeight: "14px",
              whiteSpace: "nowrap",
            }}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LineChart({
  title,
  data,
  series,
  value_format = "number",
  show_dots = true,
  x_axis_label,
  y_axis_label,
}: LineChartProps) {
  warnIfChartPaletteOverflow("LineChart", series.length);
  const tickFmt = makeTick(value_format);

  return (
    <div style={{
      background: BRAND_WHITE,
      border: BORDER_CARD,
      borderRadius: 4,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      overflow: "hidden",
    }}>
      {title && (
        <p style={{ ...TYPO_P1_BOLD, margin: 0 }}>
          {title}
        </p>
      )}

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart
            data={data}
            margin={{ top: 20, right: 16, bottom: 20, left: 4 }}
          >
            <CartesianGrid
              strokeDasharray=""
              stroke={BORDER_CHART_GRID}
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey={CATEGORY_KEY}
              axisLine={{ stroke: BORDER_CHART_GRID }}
              tickLine={false}
              tick={{ fontSize: 10, fill: SECONDARY_DARK_GREY, letterSpacing: "-0.1875" }}
              height={x_axis_label ? 40 : 24}
            >
              {x_axis_label ? (
                <Label
                  value={x_axis_label}
                  position="insideBottom"
                  offset={-8}
                  style={{ fill: SECONDARY_DARK_GREY, fontSize: 11, letterSpacing: "-0.1875px" }}
                />
              ) : null}
            </XAxis>

            <YAxis
              tickFormatter={tickFmt}
              tick={{ fontSize: 10, fill: SECONDARY_DARK_GREY, letterSpacing: "-0.1875" }}
              axisLine={false}
              tickLine={false}
              width={46}
            >
              {y_axis_label ? (
                <Label
                  value={y_axis_label}
                  angle={-90}
                  position="insideLeft"
                  style={{ fill: SECONDARY_BLACK, fontSize: 11, letterSpacing: "-0.1875px", textAnchor: "middle" }}
                />
              ) : null}
            </YAxis>

            <Tooltip
              content={<CustomTooltip value_format={value_format} />}
              cursor={{ stroke: BORDER_CHART_GRID, strokeWidth: 1 }}
            />

            {series.map((s, idx) => {
              // Always use the Figma palette by position — agent-supplied color is ignored
              // so the design-system "Patterns" sequence is always respected.
              const color = CHART_COLORS[idx % CHART_COLORS.length];
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={color}
                  strokeWidth={2}
                  dot={show_dots ? { r: 3, fill: color, strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              );
            })}
          </ReLineChart>
        </ResponsiveContainer>
      </div>

      <SeriesLegend series={series} show_dots={show_dots} />
    </div>
  );
}
