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
} from "recharts";

/**
 * BarChart — renders contracts.py :: BarChartPayload.
 *
 * Contract (contracts.py :: BarChartProps):
 *   data: list[dict]       — rows of shape { label: str, [seriesKey]: number }
 *   series: SeriesConfig[] — one entry per numeric column to plot
 *   layout: "vertical"     — bars rise along Y, categories on X  (default)
 *         | "horizontal"   — bars extend along X, categories on Y
 *
 * The category axis ALWAYS binds to the `label` field per contract.
 * Nothing else — the agent is required to name its category column `label`.
 */

const CATEGORY_KEY = "label";

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    name: string;
    value: number;
    color: string;
    payload: Record<string, unknown>;
  }>;
  label?: string;
  value_format: BarChartProps["value_format"];
}

function CustomTooltip({ active, payload, label, value_format }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const header = (row[CATEGORY_KEY] as string | undefined) ?? label ?? "";
  return (
    <div
      style={{
        background: "#0F172A",
        border: "none",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6, fontWeight: 600 }}>{header}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#CBD5E1" }}>{entry.name}</span>
          <span style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 700, marginLeft: "auto" }}>
            {formatValue(entry.value, value_format ?? "number")}
          </span>
        </div>
      ))}
    </div>
  );
}

function SeriesLegend({ series }: { series: BarChartProps["series"] }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        justifyContent: "center",
        marginBottom: 10,
        fontSize: 11,
        color: "#64748B",
      }}
    >
      {series.map((s, idx) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: s.color ?? CHART_COLORS[idx % CHART_COLORS.length],
            }}
          />
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Custom rotated tick for the category X-axis. Recharts passes
 * { x, y, payload: { value } } as props — see Recharts docs "Customize Axis Tick".
 * We render SVG text so rotation works consistently across browsers.
 */
interface RechartsTickProps {
  x?: number;
  y?: number;
  payload?: { value: string | number };
}

function RotatedCategoryTick({ x = 0, y = 0, payload }: RechartsTickProps) {
  const value = payload?.value ?? "";
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="end" transform="rotate(-35)" fill="#475569" fontSize={11}>
        {String(value)}
      </text>
    </g>
  );
}

/** Plain horizontal tick — used when labels are short enough to fit without rotation. */
function PlainCategoryTick({ x = 0, y = 0, payload }: RechartsTickProps) {
  const value = payload?.value ?? "";
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#475569" fontSize={11}>
        {String(value)}
      </text>
    </g>
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
  // Contract layout -> Recharts layout.
  // contract "horizontal" = horizontal bars -> Recharts layout="vertical"
  // contract "vertical"   = vertical bars   -> Recharts layout="horizontal"
  const horizontalBars = layout === "horizontal";
  const rechartsLayout = horizontalBars ? "vertical" : "horizontal";

  const tickFmt = makeTick(value_format);

  // Sizing heuristics driven by label length.
  const longestLabelLen = Math.max(
    4,
    ...data.map((d) => String(d[CATEGORY_KEY] ?? "").length),
  );

  const chartHeight = horizontalBars
    ? Math.max(300, data.length * 36 + 60)
    : // Reserve extra bottom room when we rotate long category labels.
      longestLabelLen > 6
      ? 380
      : 340;

  const yAxisWidth = horizontalBars ? Math.min(180, Math.max(80, longestLabelLen * 7)) : 60;
  const xTickRotated = !horizontalBars && longestLabelLen > 6;
  const bottomMargin = xTickRotated ? 56 : 24;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        padding: "20px 24px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#0F172A",
            marginBottom: 12,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
      )}

      <SeriesLegend series={series} />

      {/* ResponsiveContainer requires an explicitly sized parent (Recharts docs). */}
      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart
            data={data}
            layout={rechartsLayout}
            margin={{ top: 8, right: 24, bottom: bottomMargin, left: 12 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F1F5F9"
              horizontal={!horizontalBars}
              vertical={horizontalBars}
            />

            {/*
              IMPORTANT: XAxis and YAxis MUST be direct children of ReBarChart.
              Recharts' findChildByType does not look through React Fragments,
              so wrapping these in <>…</> makes the axes invisible to the chart
              and no tick group is emitted into the SVG.
            */}
            <XAxis
              type={horizontalBars ? "number" : "category"}
              dataKey={horizontalBars ? undefined : CATEGORY_KEY}
              tickFormatter={horizontalBars ? tickFmt : undefined}
              stroke="#94A3B8"
              interval={horizontalBars ? "preserveEnd" : 0}
              height={!horizontalBars && xTickRotated ? 56 : 30}
              tick={
                horizontalBars
                  ? { fontSize: 11, fill: "#475569" }
                  : xTickRotated
                    ? <RotatedCategoryTick />
                    : <PlainCategoryTick />
              }
            >
              {x_axis_label ? (
                <Label
                  value={x_axis_label}
                  position="insideBottom"
                  offset={!horizontalBars && xTickRotated ? -48 : -8}
                  style={{ fill: "#64748B", fontSize: 11 }}
                />
              ) : null}
            </XAxis>

            <YAxis
              type={horizontalBars ? "category" : "number"}
              dataKey={horizontalBars ? CATEGORY_KEY : undefined}
              tickFormatter={horizontalBars ? undefined : tickFmt}
              tick={{ fontSize: 11, fill: horizontalBars ? "#334155" : "#64748B" }}
              stroke="#94A3B8"
              width={yAxisWidth}
              interval={horizontalBars ? 0 : undefined}
            >
              {y_axis_label ? (
                <Label
                  value={y_axis_label}
                  angle={-90}
                  position="insideLeft"
                  style={{ fill: "#64748B", fontSize: 11, textAnchor: "middle" }}
                />
              ) : null}
            </YAxis>

            <Tooltip
              content={<CustomTooltip value_format={value_format} />}
              cursor={{ fill: "#F8FAFC" }}
            />

            {series.map((s, idx) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color ?? CHART_COLORS[idx % CHART_COLORS.length]}
                radius={horizontalBars ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={horizontalBars ? 24 : 48}
                isAnimationActive={false}
              />
            ))}
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
