"""
Canonical data contracts for AI over BI agent state.

This module is the single source of truth for every shape that flows through
tool_context.state and is streamed to the frontend via AG-UI STATE_SNAPSHOT.

Rules:
- Tools MUST serialize through these models before writing to state.
- The frontend TypeScript types in frontend/types/viz.ts and frontend/types/agent-state.ts
  MUST mirror these models exactly. Any change here requires a matching change there.
- Raw query results are returned to the LLM but are NOT written to state directly —
  only validated VizPayload objects go to state via save_visualizations().
"""

from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field

# ── Status ─────────────────────────────────────────────────────────────────────

Status = Literal["idle", "thinking", "querying", "analyzing", "ready", "error"]

# ── Shared primitives ──────────────────────────────────────────────────────────


class Delta(BaseModel):
    """Period-over-period change indicator."""

    value: float
    type: Literal["percentage", "absolute"]
    direction: Literal["up", "down", "flat"]
    label: str | None = None  # e.g. "vs Q2 2024"


class TrendPoint(BaseModel):
    """Single data point for sparkline trend series."""

    period: str   # e.g. "Q1", "Jan", "Week 12"
    value: float


class SeriesConfig(BaseModel):
    """Chart series definition — maps a data key to a display label and color."""

    key: str
    label: str
    color: str | None = None  # hex color; frontend applies palette default if absent


# ── Viz component props ────────────────────────────────────────────────────────


class KPICardProps(BaseModel):
    title: str
    value: float | str
    unit: str | None = None          # "$", "%", "guests", etc.
    value_format: Literal["number", "currency", "percentage", "raw"] = "number"
    delta: Delta | None = None
    trend: list[TrendPoint] | None = None   # sparkline; optional
    subtitle: str | None = None


class BarChartProps(BaseModel):
    title: str | None = None
    data: list[dict[str, Any]]       # [{label: str, [seriesKey]: number}]
    series: list[SeriesConfig]
    layout: Literal["vertical", "horizontal"] = "vertical"
    value_format: Literal["number", "currency", "percentage"] = "number"
    x_axis_label: str | None = None
    y_axis_label: str | None = None


class LineChartProps(BaseModel):
    title: str | None = None
    data: list[dict[str, Any]]       # [{label: str, [seriesKey]: number}]
    series: list[SeriesConfig]
    value_format: Literal["number", "currency", "percentage"] = "number"
    show_dots: bool = True
    x_axis_label: str | None = None
    y_axis_label: str | None = None


class AreaChartProps(BaseModel):
    title: str | None = None
    data: list[dict[str, Any]]
    series: list[SeriesConfig]
    value_format: Literal["number", "currency", "percentage"] = "number"
    stacked: bool = False
    x_axis_label: str | None = None
    y_axis_label: str | None = None


class DataTableColumn(BaseModel):
    key: str
    label: str
    type: Literal["string", "number", "currency", "percentage"] = "string"
    align: Literal["left", "right", "center"] = "left"


class DataTableProps(BaseModel):
    title: str | None = None
    columns: list[DataTableColumn]
    rows: list[dict[str, Any]]
    caption: str | None = None


class PeriodData(BaseModel):
    label: str    # e.g. "Q3 2024"
    value: float


class PieChartProps(BaseModel):
    title: str | None = None
    data: list[dict[str, Any]]       # [{label: str, value: number, color?: str}]
    value_format: Literal["number", "currency", "percentage"] = "number"
    show_labels: bool = True
    inner_radius: int = 0            # 0 = full pie, >0 = donut (e.g. 60)


class ComparisonCardProps(BaseModel):
    title: str
    metric: str                      # e.g. "Net Sales"
    unit: str | None = None
    value_format: Literal["number", "currency", "percentage"] = "number"
    current: PeriodData
    prior: PeriodData
    delta: Delta
    insight: str | None = None       # AnalystAgent narrative for this metric


# ── Viz payload — discriminated union ─────────────────────────────────────────


class KPICardPayload(BaseModel):
    vizType: Literal["kpi_card"] = "kpi_card"
    props: KPICardProps


class BarChartPayload(BaseModel):
    vizType: Literal["bar_chart"] = "bar_chart"
    props: BarChartProps


class LineChartPayload(BaseModel):
    vizType: Literal["line_chart"] = "line_chart"
    props: LineChartProps


class AreaChartPayload(BaseModel):
    vizType: Literal["area_chart"] = "area_chart"
    props: AreaChartProps


class DataTablePayload(BaseModel):
    vizType: Literal["data_table"] = "data_table"
    props: DataTableProps


class PieChartPayload(BaseModel):
    vizType: Literal["pie_chart"] = "pie_chart"
    props: PieChartProps


class ComparisonCardPayload(BaseModel):
    vizType: Literal["comparison_card"] = "comparison_card"
    props: ComparisonCardProps


VizPayload = Annotated[
    Union[
        KPICardPayload,
        BarChartPayload,
        LineChartPayload,
        AreaChartPayload,
        DataTablePayload,
        PieChartPayload,
        ComparisonCardPayload,
    ],
    Field(discriminator="vizType"),
]

# ── Full agent state ───────────────────────────────────────────────────────────


class AgentState(BaseModel):
    """Complete state shape streamed to the frontend via AG-UI STATE_SNAPSHOT.

    All fields are optional / have defaults so partial state updates are safe.
    The frontend must treat any field as potentially absent.
    """

    status: Status = "idle"
    session_id: str | None = None
    visualizations: list[VizPayload] = Field(default_factory=list)
    insight: str | None = None       # top-level analyst narrative
    error: str | None = None
