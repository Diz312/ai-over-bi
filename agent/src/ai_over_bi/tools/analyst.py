"""
AnalystAgent tools — period comparison, industry benchmarking, and state persistence.

compare_periods:      queries SQLite for two time windows and computes deltas.
get_industry_context: returns static fast-food industry benchmarks + model-knowledge context.
save_visualizations:  validates VizPayload list through Pydantic and writes to AG-UI state.
"""

import logging
import sqlite3
from typing import Any

from google.adk.tools import ToolContext
from pydantic import TypeAdapter, ValidationError

from ai_over_bi.config import settings
from ai_over_bi.contracts import VizPayload

logger = logging.getLogger(__name__)

_VALID_METRICS = {"net_sales", "guest_count", "avg_check"}
_VALID_QUARTERS = {"Q1", "Q2", "Q3", "Q4"}
_VALID_REGIONS = {"Northeast", "Southeast", "Midwest", "Southwest", "West"}
_VALID_LEVELS = {"total", "region", "store"}

_viz_adapter: TypeAdapter[VizPayload] = TypeAdapter(VizPayload)  # type: ignore[type-arg]


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _qtrly_totals(
    quarters: list[str],
    regions: list[str] | None,
    level: str,
) -> list[dict[str, Any]]:
    """Internal helper: sum net_sales, guest_count, avg_check for given quarters."""
    params: list[Any] = [qt for qt in quarters if qt in _VALID_QUARTERS]
    if not params:
        return []

    placeholders = ",".join("?" * len(params))
    where = f"q.quarter IN ({placeholders}) AND q.fiscal_year = 2024"

    if regions:
        safe_regions = [r for r in regions if r in _VALID_REGIONS]
        if safe_regions:
            rph = ",".join("?" * len(safe_regions))
            where += f" AND s.region IN ({rph})"
            params.extend(safe_regions)

    if level == "region":
        label_col = "s.region AS label"
        group_col = "s.region"
    elif level == "store":
        label_col = "s.store_name AS label"
        group_col = "q.store_id"
    else:  # total
        label_col = "'Total' AS label"
        group_col = "1"

    sql = f"""
        SELECT
            {label_col},
            ROUND(SUM(q.net_sales), 2)   AS net_sales,
            SUM(q.guest_count)           AS guest_count,
            ROUND(SUM(q.net_sales) / NULLIF(SUM(q.guest_count), 0), 2) AS avg_check
        FROM quarterly_sales q
        JOIN stores s ON s.store_id = q.store_id
        WHERE {where}
        GROUP BY {group_col}
        ORDER BY net_sales DESC
    """
    with _conn() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def compare_periods(
    metric: str,
    period1_quarters: list[str],
    period1_label: str,
    period2_quarters: list[str],
    period2_label: str,
    level: str,
    regions: list[str] | None,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Compare a metric across two time periods at chain, region, or store level.

    Use this tool to compute period-over-period deltas (e.g., Q3 vs Q2,
    first-half vs second-half, any two quarters). Results include absolute
    and percentage change for each group.

    Args:
        metric:           Metric to compare. One of: "net_sales", "guest_count", "avg_check".
        period1_quarters: Quarters for the first (base/prior) period. e.g. ["Q1"] or ["Q1","Q2"].
        period1_label:    Human-readable label for period 1. e.g. "Q1 2024" or "H1 2024".
        period2_quarters: Quarters for the second (current) period. e.g. ["Q2"] or ["Q3","Q4"].
        period2_label:    Human-readable label for period 2. e.g. "Q2 2024" or "H2 2024".
        level:            Aggregation level. One of: "total", "region", "store".
                          "store" returns top-50 stores by period2 metric value.
        regions:          Optional region filter. Pass null for all regions.
        tool_context:     Injected by ADK — do not pass.

    Returns:
        Dict with "comparisons" list. Each entry has:
          label, period1_value, period2_value, abs_delta, pct_delta, direction.
    """
    if metric not in _VALID_METRICS:
        metric = "net_sales"
    if level not in _VALID_LEVELS:
        level = "total"

    inv = tool_context._invocation_context
    tool_context.state["status"] = "analyzing"

    p1_rows = _qtrly_totals(period1_quarters, regions, level)
    p2_rows = _qtrly_totals(period2_quarters, regions, level)

    # Build lookup by label for period1
    p1_map = {r["label"]: r[metric] for r in p1_rows}
    p2_map = {r["label"]: r[metric] for r in p2_rows}

    # Union of all labels
    all_labels = list({*p1_map.keys(), *p2_map.keys()})
    if level == "store":
        # Sort by period2 value descending, cap at 20 for readability
        all_labels = sorted(all_labels, key=lambda l: p2_map.get(l, 0), reverse=True)[:20]

    comparisons = []
    for label in all_labels:
        v1 = p1_map.get(label, 0.0)
        v2 = p2_map.get(label, 0.0)
        abs_delta = round(v2 - v1, 2)
        pct_delta = round((v2 - v1) / v1 * 100, 2) if v1 else 0.0
        direction = "up" if abs_delta > 0 else ("down" if abs_delta < 0 else "flat")
        comparisons.append({
            "label": label,
            "period1_label": period1_label,
            "period1_value": round(v1, 2),
            "period2_label": period2_label,
            "period2_value": round(v2, 2),
            "abs_delta": abs_delta,
            "pct_delta": pct_delta,
            "direction": direction,
        })

    logger.info(
        "compare_periods",
        extra={"metric": metric, "level": level, "comparisons": len(comparisons), "session_id": inv.session.id},
    )
    return {
        "metric": metric,
        "period1_label": period1_label,
        "period2_label": period2_label,
        "level": level,
        "comparisons": comparisons,
    }


# ── Static industry benchmarks ─────────────────────────────────────────────────

_INDUSTRY_CONTEXT: dict[str, dict[str, Any]] = {
    "net_sales": {
        "qsr_avg_quarterly_per_store": 338_000,
        "fast_casual_avg_quarterly_per_store": 415_000,
        "qsr_yoy_comp_benchmark_pct": 2.8,
        "seasonality_index": {
            "Q1": 0.91, "Q2": 1.02, "Q3": 1.08, "Q4": 1.03,
        },
        "factors": [
            "Menu price increases are the primary driver of QSR comp sales growth in 2024 (~4-5%).",
            "Consumer value-seeking behavior is increasing visit frequency at value-positioned QSRs.",
            "Digital/loyalty program penetration averaging 35-40% of transactions at leading chains.",
            "Breakfast and late-night dayparts are outperforming lunch in 2024 QSR traffic.",
            "Weather events (Q1 winter storms) historically suppress Northeast/Midwest sales 3-5%.",
        ],
    },
    "guest_count": {
        "qsr_industry_traffic_trend_2024": -1.2,   # % YoY decline in industry traffic
        "benchmark_daily_guests_per_store": 340,
        "factors": [
            "QSR industry guest counts declined ~1-2% YoY in 2024 despite sales growth — driven by price increases.",
            "Value menu promotions ($5 meal deals) are recapturing lapsed guests starting Q2 2024.",
            "Drive-through and mobile order channels account for ~70% of QSR transactions.",
            "Urban core stores (NYC, Chicago, LA) seeing 5-8% above-average traffic from office return.",
            "High-income consumers increasingly trading down to fast casual, pressuring QSR premium items.",
        ],
    },
    "avg_check": {
        "qsr_industry_avg_check_2024": 12.50,
        "fast_casual_avg_check_2024": 16.80,
        "avg_check_growth_yoy_pct": 4.5,
        "factors": [
            "Menu price inflation averaging 4-5% in 2024 across QSR segment.",
            "Combo meal upsell penetration at ~55%; higher in drive-through vs. dine-in.",
            "Digital ordering channels show 12-15% higher avg check vs. counter orders.",
            "Premium LTO (limited time offers) lifting avg check 3-7% in promotional periods.",
            "Check size inversely correlated with traffic — as guests trade down, check can contract.",
        ],
    },
}


def get_industry_context(
    metric: str,
    period: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Retrieve fast-food QSR industry benchmarks and contextual factors for a metric.

    Use this tool to enrich analysis with industry knowledge — benchmarks,
    seasonal norms, and the economic/operational factors typically driving
    performance differences in the quick-service restaurant sector.

    Args:
        metric: One of "net_sales", "guest_count", "avg_check".
        period: The time period being discussed, e.g. "Q3 2024" or "H2 2024".
                Used to contextualise seasonal factors.
        tool_context: Injected by ADK — do not pass.

    Returns:
        Dict with benchmarks, seasonality index, and driving factors.
    """
    if metric not in _INDUSTRY_CONTEXT:
        metric = "net_sales"

    context = _INDUSTRY_CONTEXT[metric].copy()
    context["period"] = period
    context["note"] = (
        "These benchmarks represent the broader US QSR (quick-service restaurant) segment. "
        "QuickBite should be compared directionally — absolute gaps may reflect brand positioning."
    )

    logger.info(
        "get_industry_context",
        extra={"metric": metric, "period": period},
    )
    return context


def save_visualizations(
    visualizations: list[dict[str, Any]],
    insight: str | None,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Persist the chosen visualization payloads and analyst insight to agent state.

    This is the ONLY way to write visualizations to state. Call this after you have
    determined what data to show and which viz components are most appropriate.

    The `visualizations` parameter is a list of VizPayload objects. Each must have a
    `vizType` discriminator field and a matching `props` object. Supported vizType values:

    "kpi_card" — Single metric summary card.
      props: { title, value, unit?, value_format?, delta?: {value, type, direction, label?},
               trend?: [{period, value}], subtitle? }

    "comparison_card" — Period-over-period comparison for one metric.
      props: { title, metric, unit?, value_format?,
               current: {label, value}, prior: {label, value},
               delta: {value, type, direction, label?}, insight? }

    "bar_chart" — Categorical bar chart (vertical or horizontal).
      props: { title?, data: [{label, <seriesKey>: number}],
               series: [{key, label, color?}], layout?, value_format?,
               x_axis_label?, y_axis_label? }

    "line_chart" — Time-series line chart.
      props: { title?, data: [{label, <seriesKey>: number}],
               series: [{key, label, color?}], value_format?, show_dots?,
               x_axis_label?, y_axis_label? }

    "area_chart" — Filled area chart (good for cumulative trends).
      props: { title?, data: [{label, <seriesKey>: number}],
               series: [{key, label, color?}], value_format?, stacked?,
               x_axis_label?, y_axis_label? }

    "pie_chart" — Part-to-whole distribution (shares/mix).
      props: { title?, data: [{label, value, color?}],
               value_format?, show_labels?, inner_radius? }
      Use inner_radius=60 for a donut chart. Best for 3–8 slices.

    "data_table" — Tabular detail view.
      props: { title?, columns: [{key, label, type?, align?}],
               rows: [{<key>: value}], caption? }

    value_format options: "number" | "currency" | "percentage" | "raw"
    delta.type options:   "percentage" | "absolute"
    delta.direction:      "up" | "down" | "flat"
    layout options:       "vertical" | "horizontal"

    UNSUPPORTED TYPES: If this tool returns rejected > 0, tell the user which
    visualization type failed and that it is not currently supported.

    GUIDELINES for choosing components:
    - Single metric overview     → 1 kpi_card
    - Multiple metric summary    → multiple kpi_cards (3–4 max in a row)
    - Period comparison          → comparison_card per metric + supporting bar_chart
    - Store/region ranking       → bar_chart with layout="horizontal" (top 10–15)
    - Trend over time            → line_chart or area_chart
    - Detailed breakdown         → data_table
    - Always include a data_table for detailed drilldown alongside charts.
    - Use pie_chart for share/mix breakdowns (e.g. sales by region as % of total).
    - If save_visualizations returns rejected > 0, communicate to the user that
      the requested visualization type is not supported.

    Args:
        visualizations: List of VizPayload dicts conforming to the schema above.
        insight:        Top-level analyst narrative (2-4 sentences). Plain text, no markdown.
                        Should explain the "so what" — key takeaway for the business analyst.
        tool_context:   Injected by ADK — do not pass.

    Returns:
        Confirmation dict with saved count.
    """
    inv = tool_context._invocation_context

    validated: list[dict[str, Any]] = []
    errors: list[str] = []

    for i, v in enumerate(visualizations):
        try:
            model = _viz_adapter.validate_python(v)
            validated.append(model.model_dump())
        except ValidationError as e:
            errors.append(f"viz[{i}] ({v.get('vizType', '?')}): {e.error_count()} validation error(s)")
            logger.warning("VizPayload validation failed", extra={"index": i, "errors": str(e)})

    tool_context.state["visualizations"] = validated
    tool_context.state["insight"] = insight
    tool_context.state["status"] = "ready"
    if errors:
        tool_context.state["error"] = "; ".join(errors)
    else:
        tool_context.state["error"] = None

    logger.info(
        "save_visualizations",
        extra={
            "saved": len(validated),
            "rejected": len(errors),
            "session_id": inv.session.id,
        },
    )
    return {"saved": len(validated), "rejected": len(errors), "errors": errors}
