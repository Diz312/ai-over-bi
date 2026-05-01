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
  ResponsiveContainer,
  Label,
  LabelList,
} from "recharts";

const CATEGORY_KEY = "label";
const TOTAL_KEY = "__total";

// ── Label formatter ───────────────────────────────────────────────────────────
// Matches Figma: "26.2K", "18K", "22.5K" — trailing .0 is dropped

function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const v = value / 1_000_000;
    return `${Number(v.toFixed(1))}M`;
  }
  if (abs >= 1_000) {
    const v = value / 1_000;
    return `${Number(v.toFixed(1))}K`;
  }
  return String(Math.round(value));
}

// Custom SVG label rendered above each bar.
// Figma spec: 10px Regular, #000000, letter-spacing -0.1875px, centered, 2px gap above bar.
// Recharts passes {x, y, width, value} as props when used as a content component.
function BarValueLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  value?: number | string;
}) {
  const { x = 0, y = 0, width = 0, value } = props;
  const num = Number(value);
  if (!value || num === 0 || isNaN(num)) return null;
  return (
    <text
      x={x + width / 2}
      y={y}
      dy={-4}
      textAnchor="middle"
      fill="#000000"
      fontSize={10}
      letterSpacing="-0.1875"
      fontFamily="inherit"
    >
      {compactNumber(num)}
    </text>
  );
}

// ── Axis ticks ────────────────────────────────────────────────────────────────

interface RechartsTickProps {
  x?: number;
  y?: number;
  payload?: { value: string | number };
}

// Figma spec: 10px Regular, #6F6F6F, letter-spacing -0.1875px
function CategoryTick({ x = 0, y = 0, payload, rotate }: RechartsTickProps & { rotate?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={rotate ? 10 : 12}
        textAnchor={rotate ? "end" : "middle"}
        transform={rotate ? "rotate(-35)" : undefined}
        fill="#6F6F6F"
        fontSize={10}
        letterSpacing="-0.1875"
        fontFamily="inherit"
      >
        {String(payload?.value ?? "")}
      </text>
    </g>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipPayload {
  dataKey: string;
  name: string;
  value: number;
  color: string;
  payload: Record<string, unknown>;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  value_format: BarChartProps["value_format"];
}

function CustomTooltip({ active, payload, label, value_format }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const header = (payload[0]?.payload?.[CATEGORY_KEY] as string | undefined) ?? label ?? "";
  // Filter out injected total key; reverse so top series shows first
  const entries = [...payload].filter((e) => e.dataKey !== TOTAL_KEY).reverse();
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #D6D6D6",
      borderRadius: 4,
      padding: "8px 12px",
      boxShadow: "0px 1px 10px 0px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#292929", marginBottom: 6, letterSpacing: "-0.1875px" }}>
        {header}
      </div>
      {entries.map((entry) => (
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
// Figma spec: 8px pill dots (border-[0.1px]), gap-[4px] dot→label, gap-[20px] between items,
// Speedee Regular 11px #292929 leading-[14px] tracking-[-0.1875px]

function SeriesLegend({ series }: { series: BarChartProps["series"] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
      {series.map((s, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "100px",
              background: color,
              border: `0.1px solid ${color}`,
              flexShrink: 0,
            }} />
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

export function BarChart({
  title,
  data,
  series,
  layout = "vertical",
  stacked = false,
  value_format = "number",
  x_axis_label,
  y_axis_label,
}: BarChartProps) {
  // "vertical" in contract = bars rise up → Recharts layout="horizontal"
  // "horizontal" in contract = bars extend right → Recharts layout="vertical"
  const horizontalBars = layout === "horizontal";
  const rechartsLayout = horizontalBars ? "vertical" : "horizontal";
  const tickFmt = makeTick(value_format);

  // Inject per-row totals so <LabelList> on the top stack segment can show the
  // full stack height (Figma: "26.2K", "18K", "22.5K" above each bar group).
  const enrichedData = stacked && !horizontalBars
    ? data.map((row) => ({
        ...row,
        [TOTAL_KEY]: series.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0),
      }))
    : data;

  const longestLabelLen = Math.max(4, ...data.map((d) => String(d[CATEGORY_KEY] ?? "").length));
  const xTickRotated = !horizontalBars && longestLabelLen > 6;

  // Figma chart area height: 222px total (200px plot + 22px axis labels).
  // Add 20px top clearance for bar labels → 260px works well responsively.
  const chartHeight = horizontalBars
    ? Math.max(280, data.length * 36 + 60)
    : xTickRotated ? 320 : 260;

  // Figma Y-axis area: 46px total (8.5px rotated label + gap + right-aligned tick labels).
  const yAxisWidth = horizontalBars
    ? Math.min(180, Math.max(80, longestLabelLen * 7))
    : 46;

  const bottomMargin = xTickRotated ? 48 : 20;

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

      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart
            data={enrichedData}
            layout={rechartsLayout}
            // top:20 provides clearance for bar value labels (Figma gap-[2px] + label h-[12px])
            margin={{ top: 20, right: 16, bottom: bottomMargin, left: 4 }}
            // Gap scales with density: fewer bars → tighter gap so they fill the width,
            // more bars → wider gap to stay legible.
            barCategoryGap={data.length >= 12 ? "60%" : data.length >= 7 ? "50%" : "35%"}
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray=""
              stroke="#E8E8E8"
              horizontal={!horizontalBars}
              vertical={horizontalBars}
            />

            <XAxis
              type={horizontalBars ? "number" : "category"}
              dataKey={horizontalBars ? undefined : CATEGORY_KEY}
              tickFormatter={horizontalBars ? tickFmt : undefined}
              axisLine={{ stroke: "#E8E8E8" }}
              tickLine={false}
              interval={0}
              height={!horizontalBars && xTickRotated ? 48 : 24}
              tick={
                horizontalBars
                  ? { fontSize: 10, fill: "#6F6F6F", letterSpacing: "-0.1875" }
                  : <CategoryTick rotate={xTickRotated} />
              }
            >
              {x_axis_label ? (
                <Label
                  value={x_axis_label}
                  position="insideBottom"
                  offset={xTickRotated ? -40 : -8}
                  style={{ fill: "#6F6F6F", fontSize: 11, letterSpacing: "-0.1875px" }}
                />
              ) : null}
            </XAxis>

            <YAxis
              type={horizontalBars ? "category" : "number"}
              dataKey={horizontalBars ? CATEGORY_KEY : undefined}
              tickFormatter={horizontalBars ? undefined : tickFmt}
              tick={
                horizontalBars
                  ? { fontSize: 10, fill: "#292929", letterSpacing: "-0.1875" }
                  : { fontSize: 10, fill: "#6F6F6F", letterSpacing: "-0.1875" }
              }
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
              interval={horizontalBars ? 0 : undefined}
            >
              {y_axis_label ? (
                // Figma: rotated Y-axis title in #292929 (darker than the grey tick labels)
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
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
            />

            {series.map((s, idx) => {
              const isLast = idx === series.length - 1;
              // Always use the Figma palette by position — agent-supplied color is ignored
              // for bars so the design-system "Patterns" sequence is always respected.
              const color = CHART_COLORS[idx % CHART_COLORS.length];

              // Figma: only the topmost stack segment has rounded-tl-[2px] rounded-tr-[2px];
              // all others are square. Non-stacked bars get radius on the leading edge only.
              const radius: [number, number, number, number] = stacked
                ? (isLast ? [2, 2, 0, 0] : [0, 0, 0, 0])
                : (horizontalBars ? [0, 2, 2, 0] : [2, 2, 0, 0]);

              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={color}
                  radius={radius}
                  stackId={stacked ? "stack" : undefined}
                  isAnimationActive={false}
                >
                  {/* Stacked: show total above the top segment (last series only).
                      Figma: text-[10px] text-black tracking-[-0.1875px] gap-[2px] above bar. */}
                  {stacked && isLast && !horizontalBars && (
                    <LabelList dataKey={TOTAL_KEY} content={BarValueLabel as any} />
                  )}
                  {/* Non-stacked vertical: show individual bar values above each bar */}
                  {!stacked && !horizontalBars && (
                    <LabelList dataKey={s.key} content={BarValueLabel as any} />
                  )}
                </Bar>
              );
            })}
          </ReBarChart>
        </ResponsiveContainer>
      </div>

      <SeriesLegend series={series} />
    </div>
  );
}
