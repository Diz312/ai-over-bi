# AI over BI

AI-powered business intelligence for QuickBite restaurant chain — FY2024 performance analysis.
A CopilotKit learning vehicle demonstrating AG-UI → MCP → A2A protocol progression.

## What it does

1. Business analyst asks a natural language question via chat
2. OrchestratorAgent routes intent → DataQueryAgent or AnalystAgent
3. Agents query SQLite, compare periods, benchmark against QSR industry
4. Agent calls `save_visualizations()` with a typed `VizPayload[]`
5. Frontend VizRenderer renders the right components — KPI cards, charts, tables
6. AnalystAgent generates executive-level insight with industry reasoning

## Stack

- **Backend**: Python 3.13 + Google ADK + `ag-ui-adk` + `litellm` + FastAPI + SQLite
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4 + CopilotKit 1.54.x v2 API + Recharts
- **Protocols**: AG-UI (agent↔frontend streaming) · MCP (planned F4) · A2A (planned F5)
- **Models**: Orchestrator + AnalystAgent → `claude-sonnet-4-6` · DataQueryAgent → `claude-haiku-4-5-20251001`

## Project structure

```
gen-ui/
├── agent/
│   ├── pyproject.toml
│   ├── .env                            # (gitignored, copy from .env.example)
│   └── src/
│       └── ai_over_bi/
│           ├── __init__.py             # root_agent export (needed for adk web)
│           ├── config.py               # pydantic-settings; exports env to os.environ for LiteLLM
│           ├── logging_config.py       # JSON structured logging → stdout
│           ├── contracts.py            # Pydantic models — VizPayload discriminated union + AgentState
│           ├── main.py                 # FastAPI app, CORS, lifespan, /health
│           ├── data/
│           │   ├── seed.py             # Generates store_data.db (run once via uv run ai-over-bi-seed)
│           │   └── store_data.db       # SQLite — 100 stores, FY2024 daily + quarterly
│           ├── agents/
│           │   └── orchestrator.py     # ADK multi-agent hierarchy
│           └── tools/
│               ├── query.py            # query_daily_sales, query_quarterly_sales
│               └── analyst.py          # compare_periods, get_industry_context, save_visualizations
├── frontend/
│   ├── app/
│   │   ├── api/copilotkit/route.ts     # CopilotRuntime (AnthropicAdapter + HttpAgent)
│   │   ├── layout.tsx                  # CopilotKit provider wrapper via AppShell
│   │   ├── page.tsx                    # Chat + VizPanel side-by-side layout
│   │   ├── globals.css                 # Tailwind v4 + CopilotKit theme overrides
│   │   └── components/
│   │       ├── AppShell.tsx            # Header, sidebar, CopilotKit provider
│   │       ├── VizPanel.tsx            # Right-side dashboard — insight banner + VizRenderer
│   │       ├── VizRenderer.tsx         # Dispatches VizPayload[] to viz components
│   │       └── viz/
│   │           ├── KPICard.tsx         # Single metric with delta badge + sparkline
│   │           ├── BarChart.tsx        # Vertical/horizontal bar chart (Recharts)
│   │           ├── LineChart.tsx       # Time-series line chart (Recharts)
│   │           ├── AreaChart.tsx       # Filled area chart (Recharts)
│   │           ├── DataTable.tsx       # Sortable data table
│   │           └── ComparisonCard.tsx  # Period-over-period comparison with progress bars
│   ├── lib/
│   │   ├── format.ts                   # Number/currency/percentage formatters
│   │   └── chartColors.ts             # Shared color palette (swap here to retheme charts)
│   ├── types/
│   │   ├── viz.ts                      # TypeScript mirror of contracts.py VizPayload
│   │   └── agent-state.ts             # TypeScript mirror of contracts.py AgentState
│   ├── .env.local                      # ANTHROPIC_API_KEY for AnthropicAdapter
│   └── package.json
├── start.sh                            # One-command bootstrap + start
├── CLAUDE.md                           # This file
└── AGENTS.md                           # Agent architecture deep-dive
```

## Agent architecture

```
OrchestratorAgent (ai_over_bi)  — Sonnet, routes intent
  ├── DataQueryAgent             — Haiku: query_daily_sales, query_quarterly_sales, save_visualizations
  └── AnalystAgent               — Sonnet: compare_periods, get_industry_context, save_visualizations
```

State streamed via AG-UI `STATE_SNAPSHOT`:
```json
{
  "status": "idle|thinking|querying|analyzing|ready|error",
  "visualizations": [{"vizType": "kpi_card|bar_chart|...", "props": {...}}],
  "insight": "Executive summary narrative from AnalystAgent",
  "session_id": "...",
  "error": null
}
```

## Viz contract architecture

```
contracts.py (Python/Pydantic)  ←→  types/viz.ts (TypeScript)
      ↓                                    ↓
save_visualizations() tool          VizRenderer.tsx
      ↓                                    ↓
AgentState.visualizations[]         dispatches on vizType
      ↓                                    ↓
AG-UI STATE_SNAPSHOT            viz/KPICard|BarChart|...
```

**To swap chart library (Recharts → Nivo):** update component internals in `frontend/app/components/viz/*.tsx`.
The `VizPayload` contract and `VizRenderer` dispatch logic are not touched.

## Data

SQLite database at `agent/src/ai_over_bi/data/store_data.db`:
- **stores**: 100 QuickBite stores, 5 regions (Northeast, Southeast, Midwest, Southwest, West)
- **daily_sales**: 36,600 rows — FY2024 daily net_sales, guest_count, avg_check
- **quarterly_sales**: 400 rows — Q1–Q4 2024 pre-aggregated per store

Synthetic generation: day-of-week patterns, monthly seasonality, per-store performance tiers.

## Key commands

```bash
# Bootstrap + start everything
./start.sh

# Backend only (from agent/)
uv run ai-over-bi-serve

# Seed the database (one-time, auto-runs in start.sh)
uv run ai-over-bi-seed

# Frontend only (from frontend/)
npm run dev

# Test agents interactively without frontend (from agent/)
uv run adk web src

# Lint + type check
cd agent && uv run ruff check src/ && uv run mypy src/
```

## Environment

**agent/.env** (copy from agent/.env.example):
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com

**frontend/.env.local** (copy from frontend/.env.local.example):
- `ANTHROPIC_API_KEY` — same key, used by CopilotKit AnthropicAdapter

## Ports

- Frontend: http://localhost:3000
- Backend agent: http://localhost:8000
- Health check: http://localhost:8000/health
- Swagger UI: http://localhost:8000/docs

## CopilotKit — MANDATORY

**ALWAYS use v2 API. NEVER write v1 CopilotKit code.**

- All CopilotKit components/hooks import from `@copilotkit/react-core/v2`
- Styles: `import "@copilotkit/react-core/v2/styles.css"` in layout.tsx
- Exception: `CopilotKit` provider imports from `@copilotkit/react-core` (root)
- Exception: `@copilotkit/runtime` imports from root (server-side)

## Feature roadmap

| # | Protocol | Feature | Status |
|---|----------|---------|--------|
| F1 | AG-UI | Chat + streaming + suggestions | [x] |
| F2 | AG-UI | Generative UI — agent chooses viz components from VizPayload[] | [x] |
| F3 | AG-UI | Human-in-the-loop store/period selection | [ ] |
| F4 | MCP | External data source (live industry benchmarks via web MCP) | [ ] |
| F5 | A2A | AnalystAgent as standalone A2A service | [ ] |

## GitHub

https://github.com/Diz312/gen-ui
