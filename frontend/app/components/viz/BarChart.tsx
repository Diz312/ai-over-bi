"use client";

import type { BarChartProps } from "@/types/viz";
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
// Figma spec: 10px Regular, SECONDARY_BLACK, letter-spacing -0.1875px, centered, 2px gap above bar.
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
      fill={SECONDARY_BLACK}
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

// Figma spec: 10px Regular, SECONDARY_DARK_GREY, letter-spacing -0.1875px
function CategoryTick({ x = 0, y = 0, payload, rotate }: RechartsTickProps & { rotate?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={rotate ? 10 : 12}
        textAnchor={rotate ? "end" : "middle"}
        transform={rotate ? "rotate(-35)" : undefined}
        fill={SECONDARY_DARK_GREY}
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
      background: BRAND_WHITE,
      border: BORDER_CARD,
      borderRadius: 4,
      padding: "8px 12px",
      boxShadow: SHADOW_CARD,
    }}>
      <div style={{ ...TYPO_GRAPH_LABEL_BOLD, marginBottom: 6 }}>
        {header}
      </div>
      {entries.map((entry) => (
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
// Figma spec: 8px pill dots (border-[0.1px]), gap-[4px] dot→label, gap-[20px] between items.

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
  warnIfChartPaletteOverflow("BarChart", series.length);

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

  // ── Bar thickness ───────────────────────────────────────────────────────────
  // Explicit pixel sizes for legibility — independent of category count.
  // Vertical bars (rising) cap at MAX_SIZE so they don't get unwieldy with few categories.
  // Horizontal bars use a fixed BAR_SIZE so each row reads at consistent thickness.
  const VERTICAL_BAR_MAX_SIZE  = 48;
  const HORIZONTAL_BAR_SIZE    = 32;
  const HORIZONTAL_ROW_GAP     = 12;  // pixel gap between rows in horizontal mode

  // ── Y-axis label space reservation ──────────────────────────────────────────
  // When y_axis_label is provided, reserve extra width so the rotated label
  // doesn't overlap the right-aligned tick values.
  const Y_LABEL_RESERVE = y_axis_label ? 24 : 0;

  // Chart height — for horizontal bars, sized to fit explicit BAR_SIZE × row count.
  const chartHeight = horizontalBars
    ? Math.max(280, data.length * (HORIZONTAL_BAR_SIZE + HORIZONTAL_ROW_GAP) + 60)
    : xTickRotated ? 320 : 260;

  // Y-axis width — base size + label reserve + (in horizontal mode) tick label fit.
  const yAxisWidth = horizontalBars
    ? Math.min(220, Math.max(80, longestLabelLen * 7) + Y_LABEL_RESERVE)
    : 46 + Y_LABEL_RESERVE;

  const bottomMargin = xTickRotated ? 48 : 20;

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

      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart
            data={enrichedData}
            layout={rechartsLayout}
            // top:20 provides clearance for bar value labels (Figma gap-[2px] + label h-[12px])
            margin={{ top: 20, right: 16, bottom: bottomMargin, left: 4 }}
            // Vertical mode uses category gap to space bar groups; explicit
            // maxBarSize on the Bar caps width when categories are few.
            // Horizontal mode bypasses this — barSize is set explicitly per Bar.
            barCategoryGap={data.length >= 12 ? "30%" : data.length >= 7 ? "20%" : "15%"}
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray=""
              stroke={BORDER_CHART_GRID}
              horizontal={!horizontalBars}
              vertical={horizontalBars}
            />

            <XAxis
              type={horizontalBars ? "number" : "category"}
              dataKey={horizontalBars ? undefined : CATEGORY_KEY}
              tickFormatter={horizontalBars ? tickFmt : undefined}
              axisLine={{ stroke: BORDER_CHART_GRID }}
              tickLine={false}
              interval={0}
              height={!horizontalBars && xTickRotated ? 48 : 24}
              tick={
                horizontalBars
                  ? { fontSize: 10, fill: SECONDARY_DARK_GREY, letterSpacing: "-0.1875" }
                  : <CategoryTick rotate={xTickRotated} />
              }
            >
              {x_axis_label ? (
                <Label
                  value={x_axis_label}
                  position="insideBottom"
                  offset={xTickRotated ? -40 : -8}
                  style={{ fill: SECONDARY_DARK_GREY, fontSize: 11, letterSpacing: "-0.1875px" }}
                />
              ) : null}
            </XAxis>

            <YAxis
              type={horizontalBars ? "category" : "number"}
              dataKey={horizontalBars ? CATEGORY_KEY : undefined}
              tickFormatter={horizontalBars ? undefined : tickFmt}
              tick={
                horizontalBars
                  ? { fontSize: 10, fill: SECONDARY_BLACK, letterSpacing: "-0.1875" }
                  : { fontSize: 10, fill: SECONDARY_DARK_GREY, letterSpacing: "-0.1875" }
              }
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
              interval={horizontalBars ? 0 : undefined}
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
                  // Bar thickness — explicit per orientation:
                  //   vertical bars (rising up): cap width when few categories
                  //   horizontal bars (extending right): fixed pixel height per row
                  maxBarSize={!horizontalBars ? VERTICAL_BAR_MAX_SIZE : undefined}
                  barSize={horizontalBars ? HORIZONTAL_BAR_SIZE : undefined}
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
