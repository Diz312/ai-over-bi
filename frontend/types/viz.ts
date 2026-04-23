/**
 * Canonical TypeScript viz contracts for AI over BI.
 *
 * MUST mirror agent/src/ai_over_bi/contracts.py exactly.
 * Any change to Python models requires a matching change here.
 *
 * The discriminated union on `vizType` is the stable contract between the
 * ADK backend (save_visualizations tool) and VizRenderer.
 * Swapping chart libraries (Recharts → Nivo) only touches component internals —
 * never these interfaces.
 */

// ── Shared primitives ─────────────────────────────────────────────────────────

export type DeltaDirection = "up" | "down" | "flat";
export type DeltaType = "percentage" | "absolute";
export type ValueFormat = "number" | "currency" | "percentage" | "raw";
export type ColumnType = "string" | "number" | "currency" | "percentage";
export type ColumnAlign = "left" | "right" | "center";
export type ChartLayout = "vertical" | "horizontal";

export interface Delta {
  value: number;
  type: DeltaType;
  direction: DeltaDirection;
  label?: string | null;       // e.g. "vs Q2 2024"
}

export interface TrendPoint {
  period: string;
  value: number;
}

export interface SeriesConfig {
  key: string;
  label: string;
  color?: string | null;
}

// ── Viz component props ────────────────────────────────────────────────────────

export interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string | null;
  value_format?: ValueFormat;
  delta?: Delta | null;
  trend?: TrendPoint[] | null;
  subtitle?: string | null;
}

export interface BarChartProps {
  title?: string | null;
  data: Record<string, number | string>[];  // [{label: str, [seriesKey]: number}]
  series: SeriesConfig[];
  layout?: ChartLayout;
  value_format?: ValueFormat;
  x_axis_label?: string | null;
  y_axis_label?: string | null;
}

export interface LineChartProps {
  title?: string | null;
  data: Record<string, number | string>[];
  series: SeriesConfig[];
  value_format?: ValueFormat;
  show_dots?: boolean;
  x_axis_label?: string | null;
  y_axis_label?: string | null;
}

export interface AreaChartProps {
  title?: string | null;
  data: Record<string, number | string>[];
  series: SeriesConfig[];
  value_format?: ValueFormat;
  stacked?: boolean;
  x_axis_label?: string | null;
  y_axis_label?: string | null;
}

export interface DataTableColumn {
  key: string;
  label: string;
  type?: ColumnType;
  align?: ColumnAlign;
}

export interface DataTableProps {
  title?: string | null;
  columns: DataTableColumn[];
  rows: Record<string, number | string>[];
  caption?: string | null;
}

export interface PeriodData {
  label: string;
  value: number;
}

export interface PieSlice {
  label: string;
  value: number;
  color?: string | null;
}

export interface PieChartProps {
  title?: string | null;
  data: PieSlice[];
  value_format?: ValueFormat;
  show_labels?: boolean;
  inner_radius?: number;   // 0 = full pie, >0 = donut
}

export interface ComparisonCardProps {
  title: string;
  metric: string;
  unit?: string | null;
  value_format?: ValueFormat;
  current: PeriodData;
  prior: PeriodData;
  delta: Delta;
  insight?: string | null;
}

// ── Viz payloads — discriminated union ────────────────────────────────────────

export interface KPICardPayload {
  vizType: "kpi_card";
  props: KPICardProps;
}

export interface BarChartPayload {
  vizType: "bar_chart";
  props: BarChartProps;
}

export interface LineChartPayload {
  vizType: "line_chart";
  props: LineChartProps;
}

export interface AreaChartPayload {
  vizType: "area_chart";
  props: AreaChartProps;
}

export interface DataTablePayload {
  vizType: "data_table";
  props: DataTableProps;
}

export interface PieChartPayload {
  vizType: "pie_chart";
  props: PieChartProps;
}

export interface ComparisonCardPayload {
  vizType: "comparison_card";
  props: ComparisonCardProps;
}

/** Discriminated union — VizRenderer switches on vizType. */
export type VizPayload =
  | KPICardPayload
  | BarChartPayload
  | LineChartPayload
  | AreaChartPayload
  | DataTablePayload
  | PieChartPayload
  | ComparisonCardPayload;
