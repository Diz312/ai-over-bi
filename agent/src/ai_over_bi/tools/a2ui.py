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

    Each item in `visualizations` is a dict with two keys:
      - `vizType`: one of the discriminator values listed in the system prompt's
                   "Available visualizations" section (e.g. "kpi_card", "bar_chart").
      - `props`:   a dict of properties matching that viz type's schema.

    The system prompt is the source of truth for which viz types are available
    and what props each accepts — see the catalog there before constructing
    payloads.

    Args:
        visualizations: List of VizPayload dicts. See system prompt for catalog.
        insight:        Top-level analyst narrative (2–4 sentences, plain text).
                        The "so what" — key takeaway for the business analyst.
                        Pass None if no narrative is appropriate.
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
