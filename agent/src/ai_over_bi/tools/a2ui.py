"""
A2UI rendering tool — builds and emits A2UI v0.9 surfaces from validated viz payloads.

render_surface() is the ONLY way to push visualizations to the frontend.
It replaces save_visualizations() and returns a2ui.render() output directly
as the tool result — CopilotRuntime intercepts the a2ui_operations key and
renders the surface without it ever reaching the LLM as plain text.

Flow:
  Agent calls render_surface(visualizations, insight)
      → Pydantic validation
      → Build A2UI v0.9 component tree + data model
      → Return a2ui.render([createSurface, updateComponents, updateDataModel])
      → CopilotRuntime middleware intercepts → renders surface in frontend
"""

import logging
from typing import Any

from copilotkit import a2ui
from google.adk.tools import ToolContext
from pydantic import TypeAdapter, ValidationError

from ai_over_bi.catalog import COMPONENT_BY_VIZ_TYPE
from ai_over_bi.contracts import VizPayload

logger = logging.getLogger(__name__)

# Catalog ID for the BI app — must match what is registered in the frontend catalog.
# Defined here as the single source of truth; frontend Step 6 wires this up.
BI_CATALOG_ID = "https://github.com/Diz312/gen-ui/catalogs/bi/v1"

# Surface ID — single dashboard surface for this app.
BI_SURFACE_ID = "bi-dashboard"

# vizType → A2UI component name map. Sourced from catalog.py — the catalog
# manifest is the single source of truth. Adding a viz only requires editing
# catalog.py + contracts.py; this tool picks it up automatically.

_viz_adapter: TypeAdapter[VizPayload] = TypeAdapter(VizPayload)  # type: ignore[type-arg]


def render_surface(
    visualizations: list[dict[str, Any]],
    insight: str | None,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Render visualizations as an A2UI v0.9 surface and stream to the frontend.

    This is the ONLY way to push visualizations to the frontend. Call this after
    you have determined what data to show and chosen the appropriate viz components.

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

    GUIDELINES for choosing components:
    - Single metric overview     → 1 kpi_card
    - Multiple metric summary    → multiple kpi_cards (3–4 max in a row)
    - Period comparison          → comparison_card per metric + supporting bar_chart
    - Store/region ranking       → bar_chart with layout="horizontal" (top 10–15)
    - Trend over time            → line_chart or area_chart
    - Detailed breakdown         → data_table
    - Always include a data_table for detailed drilldown alongside charts.
    - Use pie_chart for share/mix breakdowns (e.g. sales by region as % of total).

    Args:
        visualizations: List of VizPayload dicts conforming to the schema above.
        insight:        Top-level analyst narrative (2–4 sentences). Plain text, no markdown.
                        Should explain the "so what" — key takeaway for the business analyst.
        tool_context:   Injected by ADK — do not pass.

    Returns:
        Serialized A2UI v0.9 operations string. CopilotRuntime intercepts this
        tool result and renders the surface — it does not reach the LLM as text.
    """
    inv = tool_context._invocation_context

    # ── 1. Validate all VizPayload dicts through Pydantic ─────────────────────
    validated: list[dict[str, Any]] = []
    errors: list[str] = []

    for i, v in enumerate(visualizations):
        try:
            model = _viz_adapter.validate_python(v)
            validated.append(model.model_dump(exclude_none=True))
        except ValidationError as e:
            errors.append(f"viz[{i}] ({v.get('vizType', '?')}): {e.error_count()} error(s)")
            logger.warning("VizPayload validation failed", extra={"index": i, "errors": str(e)})

    if errors:
        tool_context.state["status"] = "error"
        tool_context.state["error"] = "; ".join(errors)
        logger.error("render_surface: validation errors", extra={"errors": errors})
        # Return early — do not render a partial surface
        return {"error": f"Validation failed: {'; '.join(errors)}"}

    # ── 2. Build A2UI v0.9 component tree (adjacency list) ────────────────────
    child_ids: list[str] = []
    components: list[dict[str, Any]] = []

    # Optional insight banner — always first if present
    if insight:
        components.append({
            "id": "insight-banner",
            "component": "InsightBanner",
            "text": insight,
        })
        child_ids.append("insight-banner")

    # One component per validated viz payload
    for i, viz in enumerate(validated):
        comp_type = COMPONENT_BY_VIZ_TYPE.get(viz["vizType"])
        if not comp_type:
            logger.warning("Unknown vizType — skipping", extra={"vizType": viz["vizType"]})
            continue
        comp_id = f"viz-{i}"
        components.append({
            "id": comp_id,
            "component": comp_type,
            **viz["props"],
        })
        child_ids.append(comp_id)

    # Root Column wraps everything
    all_components: list[dict[str, Any]] = [
        {"id": "root", "component": "Column", "children": child_ids},
        *components,
    ]

    # ── 3. Build A2UI v0.9 operations ─────────────────────────────────────────
    # Stage 1: inline values only — full surface rebuild on every call.
    # Stage 2 (future): component-level dataBinding + update_data_model for
    # incremental updates when structure is unchanged (e.g. same KPIs, new region).
    # Requires catalog components to be built binding-aware in Step 6.
    operations = [
        a2ui.create_surface(BI_SURFACE_ID, catalog_id=BI_CATALOG_ID),
        a2ui.update_components(BI_SURFACE_ID, all_components),
    ]

    # ── 4. Update agent status ─────────────────────────────────────────────────
    tool_context.state["status"] = "ready"
    tool_context.state["error"] = None

    logger.info(
        "render_surface",
        extra={
            "surface_id": BI_SURFACE_ID,
            "components": len(validated),
            "has_insight": bool(insight),
            "session_id": inv.session.id,
        },
    )

    # ── 5. Return A2UI operations as a dict — CopilotRuntime intercepts this ──
    # IMPORTANT: must return a dict, NOT a string. ADK's __build_response_event
    # wraps non-dict returns as {"result": <value>} which hides the
    # a2ui_operations key from the @ag-ui/a2ui-middleware parser. Returning a
    # dict directly skips the wrap, so the parser sees a2ui_operations at the
    # top level (verified in @ag-ui/a2ui-middleware/dist/index.js → tryParseA2UIOperations).
    return {a2ui.A2UI_OPERATIONS_KEY: operations}
