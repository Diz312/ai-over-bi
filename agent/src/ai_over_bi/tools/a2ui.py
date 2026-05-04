"""
A2UI rendering tool — builds and emits A2UI v0.9 surfaces from validated viz payloads.

render_surface() is the ONLY way to push visualizations to the frontend.
It replaces save_visualizations() and returns a2ui.render() output directly
as the tool result — CopilotRuntime intercepts the a2ui_operations key and
renders the surface without it ever reaching the LLM as plain text.

Flow:
  Agent calls render_surface(visualizations, insights)
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
from ai_over_bi.contracts import InsightItem, VizPayload

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
    insights: list[dict[str, Any]] | None,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Render visualizations as an A2UI v0.9 surface and stream to the frontend.

    This is the ONLY way to push visualizations to the frontend. Call this after
    you have determined what data to show and chosen the appropriate viz components.

    Each item in `visualizations` is a dict with two keys:
      - `vizType`: one of the discriminator values listed in the system prompt's
                   "Available visualizations" section (e.g. "kpi_card", "bar_chart").
      - `props`:   a dict of properties matching that viz type's schema.

    Each item in `insights` is a structured analyst insight:
      - `headline`:  short title of the key finding (1 line, no trailing period)
      - `body`:      2–3 plain-text sentences — what happened and which levers moved
      - `why`:       "Why this matters: ..." — business impact with actual numbers (optional)
      - `sentiment`: "positive" | "negative" | "neutral"
                     positive = growth/gains/above-target
                     negative = decline/risk/below-target
                     neutral  = stable/mixed/informational

    Args:
        visualizations: List of VizPayload dicts. See system prompt for catalog.
        insights:       List of structured InsightItem dicts (see above).
                        Pass None or [] if no narrative is appropriate.
        tool_context:   Injected by ADK — do not pass.

    Returns:
        A2UI v0.9 operations dict. CopilotRuntime intercepts this tool result and
        renders the surface — it never reaches the LLM as text.
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
    # Layout strategy — size-tier hierarchy. Each viz type maps to a tier that
    # dictates how many can pack onto a row. Bar/line/area are wider than pies
    # are wider than KPIs. Solo items (a tier-group with only one viz) render
    # full-width as direct children of the root Column.
    #
    #   ┌──────────────────────────────────────────────────────┐
    #   │  InsightBanner            (full width, 2×2 grid)     │
    #   ├──────────────────────────────────────────────────────┤
    #   │  Row[ KPI · KPI · KPI · KPI ]   tier=compact (≤4)    │
    #   ├──────────────────────────────────────────────────────┤
    #   │  Row[ Pie · Pie · Pie ]         tier=medium  (≤3)    │
    #   ├──────────────────────────────────────────────────────┤
    #   │  Row[ Chart · Chart ]           tier=wide    (≤2)    │
    #   ├──────────────────────────────────────────────────────┤
    #   │  DataTable                      tier=full   (=1)     │
    #   └──────────────────────────────────────────────────────┘
    #
    # Same-tier consecutive payloads chunk into rows of up to N. Tier changes
    # flush the current chunk. Result: symmetric pairing + consistent widths.

    # Single source of truth for spacing — applied to both the root Column gap
    # (between rows) and every inner Row gap (between siblings).
    GAP_PX = 16

    # Tier assignments. Order in TIER_MAX_COLS doesn't matter for grouping
    # (preserves agent input order); it just defines max-per-row per tier.
    TIER_FOR_VIZ: dict[str, str] = {
        "kpi_card":         "compact",
        "comparison_card":  "compact",
        "pie_chart":        "medium",
        "bar_chart":        "wide",
        "line_chart":       "wide",
        "area_chart":       "wide",
        "data_table":       "full",
    }
    TIER_MAX_COLS: dict[str, int] = {
        "compact": 4,
        "medium":  3,
        "wide":    2,
        "full":    1,
    }
    DEFAULT_TIER = "wide"  # for any new vizType not yet tier-tagged

    root_children: list[str] = []
    components: list[dict[str, Any]] = []

    # Optional insight banner — always first if present.
    # Validate each InsightItem; skip malformed entries rather than failing the whole surface.
    if insights:
        valid_insights: list[dict[str, Any]] = []
        for item in insights:
            try:
                validated_item = InsightItem.model_validate(item)
                valid_insights.append(validated_item.model_dump(exclude_none=True))
            except ValidationError as e:
                logger.warning("InsightItem validation failed — skipping", extra={"errors": str(e)})
        if valid_insights:
            components.append({
                "id": "insight-banner",
                "component": "InsightBanner",
                "insights": valid_insights,
            })
            root_children.append("insight-banner")

    # ── Layout grouper ────────────────────────────────────────────────────────
    viz_counter = 0
    row_counter = 0

    def _add_viz(viz: dict[str, Any]) -> str | None:
        nonlocal viz_counter
        comp_type = COMPONENT_BY_VIZ_TYPE.get(viz["vizType"])
        if not comp_type:
            logger.warning("Unknown vizType — skipping", extra={"vizType": viz["vizType"]})
            return None
        comp_id = f"viz-{viz_counter}"
        viz_counter += 1
        components.append({"id": comp_id, "component": comp_type, **viz["props"]})
        return comp_id

    def _wrap_row(child_ids: list[str]) -> str:
        nonlocal row_counter
        rid = f"row-{row_counter}"
        row_counter += 1
        components.append({
            "id": rid,
            "component": "LayoutRow",
            "children": child_ids,
            "gap": GAP_PX,
        })
        return rid

    def _emit_group(group_payloads: list[dict[str, Any]]) -> None:
        """Emit a same-tier group as one or more Rows of up to N items.

        Single-item chunks (group of 1, or a trailing remainder of 1) go in
        as direct Column children to claim full width.
        """
        if not group_payloads:
            return
        tier = TIER_FOR_VIZ.get(group_payloads[0]["vizType"], DEFAULT_TIER)
        max_cols = TIER_MAX_COLS[tier]
        for i in range(0, len(group_payloads), max_cols):
            chunk = group_payloads[i : i + max_cols]
            chunk_ids = [cid for cid in (_add_viz(v) for v in chunk) if cid]
            if not chunk_ids:
                continue
            if len(chunk_ids) == 1:
                root_children.append(chunk_ids[0])
            else:
                root_children.append(_wrap_row(chunk_ids))

    # Walk validated payloads in order; flush at every tier boundary.
    current_tier: str | None = None
    current_group: list[dict[str, Any]] = []
    for viz in validated:
        tier = TIER_FOR_VIZ.get(viz["vizType"], DEFAULT_TIER)
        if tier != current_tier:
            _emit_group(current_group)
            current_group = []
            current_tier = tier
        current_group.append(viz)
    _emit_group(current_group)

    # Root LayoutColumn wraps everything — gap matches inner LayoutRow gap for
    # consistent vertical rhythm. We use our own LayoutColumn/LayoutRow rather
    # than the basic catalog's Column/Row because the basic renderers silently
    # drop the `gap` prop and don't equalize Row child widths.
    all_components: list[dict[str, Any]] = [
        {"id": "root", "component": "LayoutColumn", "children": root_children, "gap": GAP_PX},
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
            "has_insights": bool(insights),
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
