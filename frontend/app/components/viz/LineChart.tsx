"use client";

import type { LineChartProps } from "@/types/viz";
import { formatValue, makeTick } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chartColors";
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
      background: "#FFFFFF",
      border: "1px solid #D6D6D6",
      borderRadius: 4,
      padding: "8px 12px",
      boxShadow: "0px 1px 10px 0px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#292929", marginBottom: 6, letterSpacing: "-0.1875px" }}>
        {label}
      </div>
      {[...payload].reverse().map((entry) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: "100px", background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#6F6F6F", letterSpacing: "-0.1875px" }}>{entry.name}</span>
          <span style={{ fontSize: 11, color: "#292929", fontWeight: 700, marginLeft: "auto", paddingLeft: 12, letterSpacing: "-0.1875px" }}>
            {formatValue(entry.value, value_format ?? "number")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
// Figma: 20px × 8px line swatch (with center dot) + 4px gap + 11px Regular #292929 label.
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
            <span style={{ fontSize: 11, color: "#292929", lineHeight: "14px", letterSpacing: "-0.1875px", whiteSpace: "nowrap" }}>
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
  const tickFmt = makeTick(value_format);

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #D6D6D6",
      borderRadius: 4,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      overflow: "hidden",
    }}>
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

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart
            data={data}
            margin={{ top: 20, right: 16, bottom: 20, left: 4 }}
          >
            <CartesianGrid
              strokeDasharray=""
              stroke="#E8E8E8"
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey={CATEGORY_KEY}
              axisLine={{ stroke: "#E8E8E8" }}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#6F6F6F", letterSpacing: "-0.1875" }}
              height={x_axis_label ? 40 : 24}
            >
              {x_axis_label ? (
                <Label
                  value={x_axis_label}
                  position="insideBottom"
                  offset={-8}
                  style={{ fill: "#6F6F6F", fontSize: 11, letterSpacing: "-0.1875px" }}
                />
              ) : null}
            </XAxis>

            <YAxis
              tickFormatter={tickFmt}
              tick={{ fontSize: 10, fill: "#6F6F6F", letterSpacing: "-0.1875" }}
              axisLine={false}
              tickLine={false}
              width={46}
            >
              {y_axis_label ? (
                <Label
                  value={y_axis_label}
                  angle={-90}
                  position="insideLeft"
                  style={{ fill: "#292929", fontSize: 11, letterSpacing: "-0.1875px", textAnchor: "middle" }}
                />
              ) : null}
            </YAxis>

            <Tooltip
              content={<CustomTooltip value_format={value_format} />}
              cursor={{ stroke: "#E8E8E8", strokeWidth: 1 }}
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
