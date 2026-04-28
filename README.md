# AI over BI

**Natural-language business intelligence for a 100-store restaurant chain.**
An analyst types a question, a multi-agent AI stack queries the data, generates
visualizations, and returns an executive-level narrative — in one streamed
response.

---

## Executive summary

Traditional BI tools answer *what happened*. Analysts still have to build the
dashboard, choose the chart type, and write the narrative. **AI over BI** inverts
that workflow: the analyst asks a question in plain English and the system
decides what to query, which visualization best communicates the answer, and
how to frame the takeaway — grounded in both the company's data and industry
context.

This repository is a reference implementation using Google's Agent Development
Kit (ADK), Anthropic Claude, and CopilotKit v2, with a QuickBite quick-service
restaurant dataset (100 stores, FY2024) as the case study.

**Target use case:** Director / VP-level analysts asking questions like
*"Why did Q3 outperform Q2?"* and getting back a comparison card,
a supporting bar chart, a 12-month trend line, and a 3–5 sentence analyst
insight grounded in QSR industry benchmarks.

---

## Architecture at a glance

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser                                                           │
│  ┌──────────────┐  resizable  ┌─────────────────────────────────┐  │
│  │ CopilotChat  │─────────────│ VizPanel (Recharts components)  │  │
│  └──────────────┘             └─────────────────────────────────┘  │
│           │                                   ▲                    │
└───────────┼───────────────────────────────────┼────────────────────┘
            │  AG-UI streaming (state + events) │
┌───────────▼───────────────────────────────────┼────────────────────┐
│  Next.js server (port 3000)                   │                    │
│  ┌─────────────────────────────────────────┐  │                    │
│  │ CopilotRuntime                          │  │                    │
│  │  ├─ AnthropicAdapter (Peripheral Agent) │  │                    │
│  │  │                                      │  │                    │
│  │  └─ HttpAgent ─────────────┐            │  │                    │
│  └────────────────────────────┼────────────┘  │                    │
└───────────────────────────────┼───────────────┼────────────────────┘
                                │ /agent        │ STATE_SNAPSHOT
┌───────────────────────────────▼───────────────┴────────────────────┐
│  FastAPI + Google ADK (port 8000)                                  │
│                                                                    │
│  OrchestratorAgent (Sonnet 4.6) — routes intent, no tools          │
│   ├─ DataQueryAgent (Haiku 4.5)                                    │
│   │     tools: query_daily_sales, query_quarterly_sales,           │
│   │            save_visualizations                                 │
│   └─ AnalystAgent (Sonnet 4.6)                                     │
│         tools: compare_periods, get_industry_context,              │
│                save_visualizations                                 │
│                                                                    │
│  SQLite: stores (100) · daily_sales (36,600) · quarterly_sales (400)│
└────────────────────────────────────────────────────────────────────┘
```

---

## Stack

**Backend**
- Python 3.13 · FastAPI · Uvicorn
- Google **Agent Development Kit (ADK)** + `ag-ui-adk` bridge
- **LiteLLM** for provider abstraction (routes to Anthropic)
- **Anthropic Claude** — Sonnet 4.6 (orchestration, analysis), Haiku 4.5 (data retrieval)
- **Pydantic** for strict contract validation
- **SQLite** as the demo data store

**Frontend**
- Next.js 16 · React 19 · TypeScript
- **CopilotKit 1.54 (v2 API)** — chat UI, runtime adapters, agent state binding
- **Recharts** — bar, line, area, pie
- **Tailwind CSS v4**
- `@ag-ui/client` — HttpAgent for streaming backend communication

**Protocols in play**
| Protocol | Role | Status |
|----------|------|--------|
| **AG-UI** | Streams `STATE_SNAPSHOT` events from agent to frontend — each tool call updates the visualization panel in real time | Implemented |
| **CopilotKit v2** | Chat UI, runtime adapter for suggestions/peripherals, HttpAgent delegation | Implemented |
| **MCP** | Extension point in `get_industry_context()` — swap static QSR benchmarks for live Tavily / web-search data | Planned |
| **A2A** | Promote `AnalystAgent` to a standalone service; orchestrator delegates via A2A middleware | Planned |

---

## Why this architecture matters — engineering patterns worth flagging

### 1. Discriminated-union contract between agent and UI
Agent state is not free-form JSON. Every visualization the agent emits is a
typed `VizPayload` discriminated on `vizType`:

```
VizPayload = KPICardPayload | BarChartPayload | LineChartPayload
           | AreaChartPayload | DataTablePayload | PieChartPayload
           | ComparisonCardPayload
```

Defined once in Python ([`agent/src/ai_over_bi/contracts.py`](agent/src/ai_over_bi/contracts.py))
via Pydantic, mirrored exactly in TypeScript
([`frontend/types/viz.ts`](frontend/types/viz.ts)). The frontend dispatches
purely on `vizType` — no runtime sniffing, no optional-chain guards.

**Leadership takeaway:** swapping chart libraries (Recharts → Nivo, ECharts,
etc.) touches only component internals — never the contract, never the
dispatcher. The agent's output is validated before it reaches state, so
hallucinated or malformed payloads are rejected at the boundary rather than
crashing the UI.

### 2. Strict `STATE_SNAPSHOT` as single source of truth
The agent writes to `tool_context.state` through exactly one tool
(`save_visualizations`). State is streamed to the browser via AG-UI
`STATE_SNAPSHOT` events. The chat transcript and the visualization panel are
*independent* reactive views of that one state object. Analysts see charts
populate as the agent works — no polling, no separate endpoints, no
race conditions.

### 3. Tiered multi-agent delegation
Not every question needs a senior reasoner.
- **Data lookup** ("top 10 stores by guest count") → Haiku sub-agent, fast & cheap.
- **Analysis** ("why did Q3 outperform Q2?") → Sonnet sub-agent with
  comparison + industry-context tools.
- **Orchestrator** (Sonnet) only routes — it holds no tools itself, keeping
  the router prompt small and cheap.

**Leadership takeaway:** model-tier routing is baked into the hierarchy, not
an afterthought. Expected token-spend profile on a mixed workload:
~70% Haiku, ~30% Sonnet.

### 4. Prompt-engineered formatting invariants, validated at the boundary
Strict rules like *"`guest_count` is a count of orders, NEVER currency, NEVER
prefixed with `$`"* are embedded in every sub-agent's system prompt. Pydantic
then validates the payload shape before state is written; invalid entries are
logged and dropped rather than crashing the UI. This pattern — **prompt the
model defensively, validate at the boundary, degrade gracefully** — is the
production playbook for LLM-backed systems.

### 5. Extensible industry-context layer
`get_industry_context(metric, period)` currently returns a hand-curated set of
QSR benchmarks (menu inflation, digital mix, weather-driven traffic patterns,
seasonality indices). This is a deliberate **extension point**: the same
interface can be backed by an MCP server hitting live market data or a
retrieval pipeline over analyst research notes. The agent contract doesn't
change; the data source does.

### 6. Structured session-level observability
JSON structured logging to stdout, session IDs propagated through every tool
call, model/status/latency logged per invocation. Production-grade tracing
without pulling in a full observability vendor.

---

## Data layer

**Demo dataset:** synthetic but realistic FY2024 data for 100 QuickBite
stores across 5 US regions — generated by
[`agent/src/ai_over_bi/data/seed.py`](agent/src/ai_over_bi/data/seed.py).

| Table | Rows | Purpose |
|-------|------|---------|
| `stores` | 100 | Store master — id, name, city, state, region |
| `daily_sales` | 36,600 | 100 stores × 366 days — net_sales, guest_count, avg_check |
| `quarterly_sales` | 400 | Pre-aggregated rollup for fast quarterly queries |

**Variability baked into the data:**
- Pronounced seasonality (Q3 peak ~1.7× Q1 trough)
- Regional differentiation (Southwest $57.6M ↔ Midwest $23.6M — 2.4× spread)
- Regional-seasonal interactions (Northeast Q1 weather drag, Southwest Q3 heat dip)
- 12 event-day spikes (Super Bowl, July 4, Black Friday, reduced Thanksgiving/Christmas)
- Store-tier spread (0.48× – 1.75×) for sharp ranking charts
- Decoupled check-premium so traffic-vs-check analysis shows meaningful scatter

**Query tools:**
- `query_daily_sales` — date-range, region, store filters; group_by day/week/month/region/store
- `query_quarterly_sales` — quarter, region, store filters; group_by quarter/region/store
- `compare_periods` — period-over-period deltas with direction + pct change
- `get_industry_context` — QSR benchmarks, seasonality index, driving factors

---

## Visualization library

Seven typed components under [`frontend/app/components/viz/`](frontend/app/components/viz/),
each bound one-to-one to a payload type:

| Component | Use case |
|-----------|----------|
| `KPICard` | Single metric with optional delta badge + sparkline |
| `BarChart` | Rankings, regional breakdowns, grouped multi-series |
| `LineChart` | Time-series trends (monthly, quarterly) |
| `AreaChart` | Filled trends, stacked regional views |
| `PieChart` | Mix / share breakdowns (donut variant via `inner_radius`) |
| `DataTable` | Detailed drilldown with typed columns |
| `ComparisonCard` | Period-over-period with delta arrow + analyst insight |

Layout strategy lives in [`VizRenderer.tsx`](frontend/app/components/VizRenderer.tsx):
KPI cards in a responsive grid, comparison cards in 2-col, charts full-width,
tables at the bottom for drilldown.

---

## Running it

### Prerequisites
- Python 3.13, [uv](https://docs.astral.sh/uv/)
- Node.js 20+, npm
- Anthropic API key (`ANTHROPIC_API_KEY`)

### One-command bootstrap
```bash
./start.sh
```
Provisions `.env` files, syncs deps, seeds the database, and starts both services.

### Manual
```bash
# Backend
cd agent
cp .env.example .env                 # add ANTHROPIC_API_KEY
uv sync
uv run ai-over-bi-seed               # one-time: generate store_data.db
uv run ai-over-bi-serve              # FastAPI on :8000

# Frontend (separate terminal)
cd frontend
cp .env.local.example .env.local     # same ANTHROPIC_API_KEY
npm install --legacy-peer-deps
npm run dev                          # Next.js on :3000
```

### Standalone agent testing (no frontend)
```bash
cd agent && uv run adk web src
```

### Quality gates
```bash
cd agent && uv run ruff check src/ && uv run mypy src/
cd agent && uv run pytest tests/ -v
```

---

## Endpoints & ports

| Service | Port | Notes |
|---------|------|-------|
| Frontend | **3000** | Next.js — chat + viz panel |
| Backend | **8000** | FastAPI + ADK |
| `GET /health` | 8000 | `{status, service, db_ready}` |
| `POST /agent` | 8000 | AG-UI streaming endpoint |
| `GET /docs` | 8000 | OpenAPI / Swagger UI |

---

## Configuration

**Backend** (`agent/.env`)
| Variable | Default | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | — | **Required.** Anthropic Console key |
| `ORCHESTRATOR_MODEL` | `claude-sonnet-4-6` | Top-level reasoner |
| `SUBAGENT_MODEL` | `claude-haiku-4-5-20251001` | Data-retrieval sub-agent |
| `HOST` / `PORT` | `0.0.0.0` / `8000` | Bind |
| `LOG_LEVEL` | `INFO` | Structured JSON logging |

**Frontend** (`frontend/.env.local`)
| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Used by CopilotKit's AnthropicAdapter for suggestions / peripherals |

---

## Repository map

```
gen-ui/
├── agent/                              # Python backend
│   ├── src/ai_over_bi/
│   │   ├── agents/orchestrator.py      # Multi-agent hierarchy + instructions
│   │   ├── contracts.py                # Pydantic — single source of truth for state
│   │   ├── tools/
│   │   │   ├── query.py                # Read-only data access
│   │   │   └── analyst.py              # compare_periods, industry context, save_visualizations
│   │   ├── data/
│   │   │   ├── seed.py                 # Synthetic FY2024 generator
│   │   │   └── store_data.db           # (generated)
│   │   ├── config.py                   # Pydantic settings
│   │   ├── logging_config.py           # JSON structured logs
│   │   └── main.py                     # FastAPI app + lifespan
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── api/copilotkit/route.ts     # CopilotRuntime wiring
│   │   ├── components/
│   │   │   ├── VizRenderer.tsx         # Dispatch on vizType
│   │   │   └── viz/                    # KPICard, BarChart, LineChart, …
│   │   ├── layout.tsx                  # CopilotKit provider
│   │   └── page.tsx                    # Resizable chat + viz layout
│   ├── types/
│   │   ├── viz.ts                      # TS mirror of contracts.py
│   │   └── agent-state.ts
│   ├── lib/                            # format, chartColors
│   └── package.json
├── start.sh
├── CLAUDE.md                           # Project conventions for AI collaborators
├── AGENTS.md                           # Deep-dive agent architecture
└── README.md                           # This file
```

---

## Roadmap

| # | Feature | Protocol | Status |
|---|---------|----------|--------|
| F1 | Chat · streaming · suggestions | AG-UI + CopilotKit v2 | Done |
| F2 | Generative UI — typed viz payloads rendered from agent state | AG-UI | Done |
| F3 | Human-in-the-loop — analyst edits / approves agent suggestions before save | AG-UI shared state | Planned |
| F4 | Live industry context via MCP (Tavily, analyst research) | MCP | Planned |
| F5 | Analyst agent as a standalone A2A service | A2A | Planned |

---

## License

Internal / demo. Not for production use without review.
