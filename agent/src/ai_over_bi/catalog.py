"""
Viz catalog — single source of truth for the viz components available to agents.

When adding a new viz type, only this file (and contracts.py) need to change on
the backend. The tool, the agent prompts, and the validator all read from here:

  - contracts.py defines the Pydantic shape of each viz's props
  - catalog.py registers each viz with LLM-facing metadata (description, when_to_use)
  - tools/a2ui.py uses COMPONENT_BY_VIZ_TYPE to map discriminator → component name
  - agents/prompts/*.md include {viz_catalog} placeholder; prompt_loader injects
    format_catalog_for_prompt() at agent build time

Frontend mirrors live in:
  - frontend/types/viz.ts             (TypeScript prop interfaces)
  - frontend/lib/a2ui/definitions.ts  (Zod schemas)
  - frontend/lib/a2ui/renderers.tsx   (component name → React component)
  - frontend/app/components/viz/*.tsx (the actual rendered components)

The component_name field on each entry MUST match the key in
frontend/lib/a2ui/definitions.ts → biDefinitions and the React component
exported from frontend/app/components/viz/<Name>.tsx.
"""

from dataclasses import dataclass

from ai_over_bi.contracts import (
    AreaChartPayload,
    BarChartPayload,
    ComparisonCardPayload,
    DataTablePayload,
    KPICardPayload,
    LineChartPayload,
    PieChartPayload,
)


@dataclass(frozen=True)
class VizCatalogEntry:
    """Catalog entry for a single viz component.

    Each entry pairs a Pydantic payload class (the validator) with LLM-facing
    metadata (description + selection guidance) and the frontend component name.
    """

    viz_type: str            # discriminator value in contracts.VizPayload union
    component_name: str      # name registered in frontend A2UI catalog
    payload_class: type      # Pydantic class that validates props
    description: str         # one-line LLM-facing summary
    when_to_use: str         # selection guidance — when an agent should pick this viz
    props_summary: str       # brief prop signature for the prompt


# ── Manifest ───────────────────────────────────────────────────────────────────
# Add new viz types here. Order is preserved in prompt output.

VIZ_CATALOG: tuple[VizCatalogEntry, ...] = (
    VizCatalogEntry(
        viz_type="kpi_card",
        component_name="KPICard",
        payload_class=KPICardPayload,
        description="Single metric summary card with optional delta badge and sparkline trend.",
        when_to_use="Headline metric overview. Use 3–4 kpi_cards in a row for a summary; one alone for a single hero metric.",
        props_summary="{ title, value, unit?, value_format?, delta?: {value, type, direction, label?}, trend?: [{period, value}], subtitle? }",
    ),
    VizCatalogEntry(
        viz_type="comparison_card",
        component_name="ComparisonCard",
        payload_class=ComparisonCardPayload,
        description="Period-over-period comparison card for a single metric (current vs prior + delta).",
        when_to_use="Period comparison questions. One comparison_card per metric. Pair with bar_chart for breakdowns.",
        props_summary="{ title, metric, unit?, value_format?, current: {label, value}, prior: {label, value}, delta: {value, type, direction, label?}, insight? }",
    ),
    VizCatalogEntry(
        viz_type="bar_chart",
        component_name="BarChart",
        payload_class=BarChartPayload,
        description="Categorical bar chart, vertical or horizontal layout.",
        when_to_use='Store/region rankings → use layout="horizontal" with top 10–15 entries. Quarterly breakdowns → layout="vertical".',
        props_summary="{ title?, data: [{label, <seriesKey>: number}], series: [{key, label, color?}], layout?, value_format?, x_axis_label?, y_axis_label? }",
    ),
    VizCatalogEntry(
        viz_type="line_chart",
        component_name="LineChart",
        payload_class=LineChartPayload,
        description="Time-series line chart.",
        when_to_use="Trend over time (daily, monthly, quarterly). Best for continuous metric movement.",
        props_summary="{ title?, data: [{label, <seriesKey>: number}], series: [{key, label, color?}], value_format?, show_dots?, x_axis_label?, y_axis_label? }",
    ),
    VizCatalogEntry(
        viz_type="area_chart",
        component_name="AreaChart",
        payload_class=AreaChartPayload,
        description="Filled area chart, optionally stacked.",
        when_to_use="Cumulative trends, or stacked composition over time. stacked=true for multi-series composition.",
        props_summary="{ title?, data: [{label, <seriesKey>: number}], series: [{key, label, color?}], value_format?, stacked?, x_axis_label?, y_axis_label? }",
    ),
    VizCatalogEntry(
        viz_type="pie_chart",
        component_name="PieChart",
        payload_class=PieChartPayload,
        description="Part-to-whole distribution (shares/mix).",
        when_to_use="Share/mix breakdowns (e.g. sales by region as % of total). Best for 3–8 slices. Use inner_radius=60 for a donut.",
        props_summary="{ title?, data: [{label, value, color?}], value_format?, show_labels?, inner_radius? }",
    ),
    VizCatalogEntry(
        viz_type="data_table",
        component_name="DataTable",
        payload_class=DataTablePayload,
        description="Tabular detail view with typed columns.",
        when_to_use="Drilldown detail. Always include alongside charts so analysts can inspect underlying numbers.",
        props_summary="{ title?, columns: [{key, label, type?, align?}], rows: [{<key>: value}], caption? }",
    ),
)


# ── Derived lookups ────────────────────────────────────────────────────────────

COMPONENT_BY_VIZ_TYPE: dict[str, str] = {
    entry.viz_type: entry.component_name for entry in VIZ_CATALOG
}


# ── Prompt rendering ───────────────────────────────────────────────────────────

def format_catalog_for_prompt() -> str:
    """Render the viz catalog as markdown for injection into agent prompts.

    Substituted into prompts at agent build time via prompt_loader so prompt
    authors don't need to maintain the catalog list manually.
    """
    sections: list[str] = []
    for entry in VIZ_CATALOG:
        sections.append(
            f"- **{entry.viz_type}** ({entry.component_name}) — {entry.description}\n"
            f"  Use when: {entry.when_to_use}\n"
            f"  Props: `{entry.props_summary}`"
        )
    return "\n".join(sections)


__all__ = [
    "VIZ_CATALOG",
    "VizCatalogEntry",
    "COMPONENT_BY_VIZ_TYPE",
    "format_catalog_for_prompt",
]
