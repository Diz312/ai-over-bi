# Agent Architecture — AI over BI

## Overview

Three-tier ADK multi-agent hierarchy. All agents share session state via `tool_context.state`,
which is streamed to the frontend as AG-UI `STATE_SNAPSHOT` events after each tool call.

```
OrchestratorAgent (ai_over_bi)
  ├── DataQueryAgent (data_query_agent)
  └── AnalystAgent  (analyst_agent)
```

## OrchestratorAgent

**Model**: `claude-sonnet-4-6`
**File**: `agent/src/ai_over_bi/agents/orchestrator.py`

Responsibilities:
- Understand user intent (show data vs. compare/analyze)
- Route to the correct sub-agent with full context
- Ask one clarifying question if needed

Routing logic:
- "Show me / display / list / what are" → `data_query_agent`
- "Compare / analyze / explain / benchmark / why" → `analyst_agent`

## DataQueryAgent

**Model**: `claude-haiku-4-5-20251001`
**Tools**: `query_daily_sales`, `query_quarterly_sales`, `save_visualizations`

Handles "show me data" requests. Fetches raw data and builds appropriate visualizations.
Good for: trends, rankings, breakdowns by region/store.

### query_daily_sales
```python
query_daily_sales(
    date_from: str | None,   # YYYY-MM-DD
    date_to: str | None,     # YYYY-MM-DD
    regions: list[str] | None,
    store_ids: list[int] | None,
    group_by: "day" | "week" | "month" | "store" | "region",
    tool_context: ToolContext,
) -> {"rows": [...], "row_count": int}
```

### query_quarterly_sales
```python
query_quarterly_sales(
    quarters: list[str] | None,   # ["Q1", "Q2", "Q3", "Q4"]
    regions: list[str] | None,
    store_ids: list[int] | None,
    group_by: "quarter" | "store" | "region",
    tool_context: ToolContext,
) -> {"rows": [...], "row_count": int}
```

## AnalystAgent

**Model**: `claude-sonnet-4-6` (Sonnet for deep reasoning)
**Tools**: `compare_periods`, `get_industry_context`, `save_visualizations`

Handles compare/analyze/explain requests. Runs period-over-period comparisons,
benchmarks against QSR industry, generates executive insight narratives.

### compare_periods
```python
compare_periods(
    metric: "net_sales" | "guest_count" | "avg_check",
    period1_quarters: list[str],   # e.g. ["Q1"]
    period1_label: str,            # e.g. "Q1 2024"
    period2_quarters: list[str],   # e.g. ["Q2"]
    period2_label: str,            # e.g. "Q2 2024"
    level: "total" | "region" | "store",
    regions: list[str] | None,
    tool_context: ToolContext,
) -> {"metric": ..., "comparisons": [{"label", "period1_value", "period2_value", "abs_delta", "pct_delta", "direction"}]}
```

### get_industry_context
```python
get_industry_context(
    metric: "net_sales" | "guest_count" | "avg_check",
    period: str,   # e.g. "Q3 2024"
    tool_context: ToolContext,
) -> {"benchmarks": {...}, "seasonality_index": {...}, "factors": [...]}
```
Returns static QSR industry benchmarks + driving factors for LLM reasoning.
**Extension point**: swap static return for Tavily web search (F4/MCP) to get live data.

## save_visualizations (shared)

Both sub-agents call this to write results to state.

```python
save_visualizations(
    visualizations: list[dict],   # VizPayload dicts — validated through Pydantic
    insight: str | None,          # Executive summary, plain text, 3-5 sentences
    tool_context: ToolContext,
) -> {"saved": int, "rejected": int}
```

Validates each dict through `TypeAdapter(VizPayload)` — invalid payloads are rejected
with a warning logged, not a hard failure. Writes to:
- `tool_context.state["visualizations"]` — list of serialized VizPayload dicts
- `tool_context.state["insight"]` — analyst narrative
- `tool_context.state["status"]` — "ready"

## State contract

```python
class AgentState(BaseModel):
    status: Literal["idle", "thinking", "querying", "analyzing", "ready", "error"]
    session_id: str | None
    visualizations: list[VizPayload]   # discriminated union, vizType is discriminator
    insight: str | None
    error: str | None
```

## VizPayload discriminated union

```
vizType          Props model
─────────────── ──────────────────────────────────────────────────────────
kpi_card         KPICardProps       — title, value, unit, delta, trend
bar_chart        BarChartProps      — title, data[], series[], layout, value_format
line_chart       LineChartProps     — title, data[], series[], show_dots, value_format
area_chart       AreaChartProps     — title, data[], series[], stacked, value_format
data_table       DataTableProps     — title, columns[], rows[]
comparison_card  ComparisonCardProps — title, metric, current, prior, delta, insight
```

Python source: `agent/src/ai_over_bi/contracts.py`
TypeScript mirror: `frontend/types/viz.ts`

## Extension points

### F4 — Live industry data via MCP
Replace `get_industry_context` static return with a Tavily/web MCP tool call.
The function signature stays identical — AnalystAgent instruction unchanged.

### F5 — AnalystAgent as A2A service
Promote `analyst_agent` to a standalone FastAPI app with an A2A endpoint.
OrchestratorAgent delegates via `@ag-ui/a2a-middleware` instead of direct ADK sub-agent.
