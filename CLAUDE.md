# AI over BI

AI-powered business intelligence for QuickBite restaurant chain — FY2024 performance analysis.
A CopilotKit learning vehicle demonstrating AG-UI → MCP → A2A protocol progression.

## Working Discipline — MANDATORY

These rules apply to every session on this project. They override default behavior.

### Terminology

- **CPK** = **CopilotKit**. The user uses this abbreviation freely. Treat any mention of `CPK` as referring to CopilotKit (the framework, runtime, hooks, components, providers, MCP server, anything in their ecosystem). Do not ask for clarification.

### MCP servers — use them, route correctly

This project has multiple MCP servers configured. They are **authoritative** sources of truth for their domains. Using `grep`, `find`, `WebFetch`, or guessing from training data instead of the appropriate MCP is a process failure.

**Routing matrix — first stop for each topic:**

| Topic | MCP server | Tools |
|-------|-----------|-------|
| CopilotKit (runtime, hooks, components, providers, route.ts patterns) | `copilotkit-mcp` | `search-docs`, `search-code`, `explore-docs`, `explore-code` |
| AG-UI protocol (events, state snapshot, transport) | `copilotkit-mcp` | `search-ag-ui-docs`, `search-ag-ui-code` |
| A2UI v0.9 spec (surfaces, components, operations, data binding) | `mitsuru-a2ui-mcp` | `a2ui_*` tools (reference only — NOT part of the app) |
| Google ADK (LlmAgent, ToolContext, sessions, sub_agents) | `adk-docs-mcp` | `list_doc_sources`, `fetch_docs` |
| Any other library (Recharts, Tailwind, Pydantic, FastAPI, Next.js, Pandas, etc.) | `context7` | `resolve-library-id`, `query-docs` |

**Rules:**

1. **MCP first** — for any framework/library question, the first action is the appropriate MCP search. Not grep. Not WebFetch. Not "I think I remember…".
2. **Verify against installed code as a second step**, not the only step. Docs are the contract; installed types tell you the contract in this exact version. Reconcile both before writing code.
3. **Be exhaustive across servers when topics span domains** — e.g. an A2UI + CopilotKit integration question requires both `mitsuru-a2ui-mcp` and `copilotkit-mcp`.
4. **`mitsuru-a2ui-mcp` is for me (Claude) only** — it is a reference tool to look up the A2UI API, not part of the application.

### Stop when uncertain

If I cannot answer a question without guessing, I say "I need to verify X" and use the appropriate MCP. I do not assemble fragments into a confident-sounding plan and call it analysis.

### Never propose changes to working code without proof the change is needed

If something *might* need changing, I verify against MCP + installed types first. I do not speculate-then-refactor.

### Treat corrections as process failures, not just wrong answers

When the user pushes back, the question is "what step in my workflow let the wrong answer through?" — not just "what's the right answer now?" Each correction tightens the loop.

### Speed vs. rigor

Default to rigor. The user is non-expert in this stack and is relying on me to be the technical authority. Speed that produces wrong answers wastes their time, not saves it.

## What it does

1. Business analyst asks a natural language question via chat
2. OrchestratorAgent (Sonnet) routes intent → DataQueryAgent or AnalystAgent
3. Sub-agents query SQLite, compare periods, benchmark against QSR industry
4. Agent calls `render_surface()` — emits an A2UI v0.9 surface as the tool result
5. CopilotRuntime A2UI middleware intercepts the tool result and patches the frontend surface
6. React catalog components render KPI cards, charts, tables, insight banner
7. AnalystAgent generates executive-level insight with industry reasoning

## Stack

- **Backend**: Python 3.13 + Google ADK + `ag-ui-adk` + `litellm` + FastAPI + SQLite + `copilotkit` (A2UI helpers)
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4 + CopilotKit 1.54.x v2 API + Recharts + `@copilotkit/a2ui-renderer` (Step 6, pending)
- **Protocols**: AG-UI (transport) · A2UI v0.9 (declarative UI protocol) · MCP (planned F4) · A2A (planned F5)
- **Models**: Orchestrator + AnalystAgent → `claude-sonnet-4-6` · DataQueryAgent → `claude-haiku-4-5-20251001`

## Project structure

```
gen-ui/
├── agent/
│   ├── pyproject.toml                    # deps include `copilotkit` for a2ui helpers
│   ├── .env                              # (gitignored, copy from .env.example)
│   └── src/
│       └── ai_over_bi/
│           ├── __init__.py               # root_agent export (needed for adk web)
│           ├── config.py                 # pydantic-settings; exports env to os.environ for LiteLLM
│           ├── logging_config.py         # JSON structured logging → stdout
│           ├── contracts.py              # SINGLE SOURCE OF TRUTH — VizPayload union + AgentState
│           ├── main.py                   # FastAPI app, CORS, lifespan, /health
│           ├── data/
│           │   ├── seed.py               # Generates store_data.db (uv run ai-over-bi-seed)
│           │   └── store_data.db         # SQLite — 100 stores, FY2024 daily + quarterly
│           ├── agents/
│           │   ├── orchestrator.py       # OrchestratorAgent — routes intent, builds hierarchy
│           │   ├── data_query.py         # DataQueryAgent factory (build_data_query_agent)
│           │   ├── analyst.py            # AnalystAgent factory (build_analyst_agent)
│           │   └── prompts/              # Editable prompts — change behavior without touching Python
│           │       ├── orchestrator.md
│           │       ├── data_query.md
│           │       └── analyst.md
│           └── tools/
│               ├── query.py              # query_daily_sales, query_quarterly_sales
│               ├── analyst.py            # compare_periods, get_industry_context
│               └── a2ui.py               # render_surface — ONLY way to push viz to frontend
├── frontend/
│   ├── app/
│   │   ├── api/copilotkit/route.ts       # CopilotRuntime + a2ui: {} + AnthropicAdapter
│   │   ├── layout.tsx                    # CopilotKit provider wrapper via AppShell
│   │   ├── page.tsx                      # Chat + viz panel side-by-side layout
│   │   ├── globals.css                   # Tailwind v4 + CopilotKit theme overrides
│   │   └── components/
│   │       ├── AppShell.tsx              # Header + CopilotKit provider (A2UIProvider added in Step 6)
│   │       ├── VizPanel.tsx              # [LEGACY — refactored in Step 6 to host A2UIRenderer]
│   │       ├── VizRenderer.tsx           # [LEGACY — deleted in Step 6, replaced by A2UI catalog]
│   │       └── viz/                      # React components — registered in A2UI catalog (Step 6)
│   │           ├── KPICard.tsx           # Single metric with delta badge + sparkline
│   │           ├── BarChart.tsx          # Vertical/horizontal bar chart (Recharts)
│   │           ├── LineChart.tsx         # Time-series line chart (Recharts)
│   │           ├── AreaChart.tsx         # Filled area chart (Recharts)
│   │           ├── PieChart.tsx          # Pie/donut share chart (Recharts)
│   │           ├── DataTable.tsx         # Sortable data table
│   │           └── ComparisonCard.tsx    # Period-over-period comparison
│   ├── lib/
│   │   ├── format.ts                     # Number/currency/percentage formatters
│   │   ├── chartColors.ts                # Shared color palette
│   │   └── a2ui/                         # [Step 6] catalog.ts — registers viz components
│   ├── types/
│   │   ├── viz.ts                        # [LEGACY — TS reference, not runtime once Step 6 lands]
│   │   └── agent-state.ts                # TypeScript mirror of contracts.py AgentState
│   ├── .env.local                        # ANTHROPIC_API_KEY for AnthropicAdapter
│   └── package.json
├── docs/
│   └── 3_a2ui-learning-plan.md           # A2UI learning plan tied to F1–F5 roadmap
├── start.sh                              # One-command bootstrap + start
├── CLAUDE.md                             # This file
└── AGENTS.md                             # Agent architecture deep-dive
```

## Agent architecture

```
OrchestratorAgent (ai_over_bi)             — Sonnet, routes intent, no tools of its own
  ├── DataQueryAgent (data_query_agent)    — Haiku: query_daily_sales, query_quarterly_sales, render_surface
  └── AnalystAgent  (analyst_agent)        — Sonnet: compare_periods, get_industry_context, render_surface
```

- **Tools are passed via factory functions** — `build_data_query_agent(render_surface)` and `build_analyst_agent(render_surface)` to avoid circular imports.
- **Prompts live in `agents/prompts/*.md`** and are loaded at agent construction time. Edit the markdown to change behavior — no Python touched.
- **`render_surface` is the only way to push visualizations to the frontend.** It returns A2UI v0.9 operations that CopilotRuntime intercepts.

### AgentState (slim — STATE_SNAPSHOT only carries UI signals)

```json
{
  "status":     "idle|thinking|querying|analyzing|ready|error",
  "session_id": "...",
  "error":      null
}
```

Visualizations and insight are **NOT** in AgentState. They flow through A2UI surface operations, not STATE_SNAPSHOT.

## A2UI architecture (v0.9, fixed schema)

A2UI is a **declarative UI protocol** — independent from AG-UI. AG-UI is the transport (over which A2UI messages flow); A2UI is the contract for how UI is structured.

### Flow

```
Agent decides what to render
      ↓
render_surface(visualizations, insight)        ← agent/src/ai_over_bi/tools/a2ui.py
      ↓
Pydantic validation (VizPayload union)         ← agent/src/ai_over_bi/contracts.py
      ↓
Build A2UI v0.9 component tree (adjacency list)
      ↓
a2ui.render([createSurface, updateComponents]) ← copilotkit Python SDK
      ↓
Tool result = {"a2ui_operations": [...]}
      ↓
AG-UI TOOL_CALL_RESULT event → CopilotRuntime
      ↓
CopilotRuntime A2UI middleware (a2ui: {} in route.ts) detects "a2ui_operations" key
      ↓
Patches A2UI surface state on the client
      ↓
React catalog renders the components in the DOM
```

### Catalog and surface IDs (single source of truth)

```python
# agent/src/ai_over_bi/tools/a2ui.py
BI_CATALOG_ID = "https://github.com/Diz312/gen-ui/catalogs/bi/v1"
BI_SURFACE_ID = "bi-dashboard"
```

The frontend catalog (Step 6) MUST register under the same `BI_CATALOG_ID` and render the `bi-dashboard` surface.

### Component tree shape (adjacency list, flat props)

A2UI v0.9 uses an adjacency list — flat array of components, parent references children by ID. Component properties are at the **top level** (NOT nested under `props`).

```json
[
  {"id": "root", "component": "Column", "children": ["insight-banner", "viz-0", "viz-1"]},
  {"id": "insight-banner", "component": "InsightBanner", "text": "..."},
  {"id": "viz-0", "component": "KPICard", "title": "Net Sales", "value": 18550227.46, "unit": "$", "value_format": "currency"},
  {"id": "viz-1", "component": "LineChart", "title": "...", "data": [...], "series": [...], ...}
]
```

### Stage 1 (current) vs Stage 2 (future) — incremental updates

**Stage 1 — inline values, full rebuild every call.**
Every `render_surface` call sends `createSurface + updateComponents`. All values are baked inline. No `update_data_model`. Simple, ships fast.

**Stage 2 — data binding for incremental updates.**
For scenarios like "same KPIs, different region," only the data should update — not the component tree. Requires:
1. Catalog components built **binding-aware** — they read props from a data model path when `dataBinding` is set.
2. `render_surface` logic to detect "same structure, new data" and emit only `update_data_model`.
3. A defined data-model schema (e.g. `/kpis/net_sales`).

**Step 6 design constraint — catalog components in `frontend/lib/a2ui/catalog.ts` MUST be built binding-aware from the start** so Stage 2 is a backend-only change later.

### What does NOT use data binding (per A2UI v0.9 spec)

The A2UI SDK is explicit: data binding (`{ "path": "..." }`) is for **interactive form inputs** (TextField values, button action contexts). Using it on display properties that don't declare path support in their schema causes a runtime crash. For BI display use **inline literals**.

## Viz contract architecture

```
contracts.py (Python/Pydantic, single source of truth)
      ↓
render_surface() validates VizPayload union, dumps with exclude_none=True
      ↓
A2UI v0.9 component tree (flat props, top-level)
      ↓
CopilotRuntime A2UI middleware
      ↓
Frontend A2UI catalog (Step 6) — maps component name → React component
      ↓
viz/KPICard | BarChart | LineChart | AreaChart | PieChart | DataTable | ComparisonCard | InsightBanner
```

**To swap chart library (Recharts → Nivo):** update component internals in `frontend/app/components/viz/*.tsx`. The contracts, the A2UI catalog mapping, and `render_surface` are not touched.

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

**Frontend uses v2 API. Backend (route.ts + runtime) is v1 — DO NOT migrate route.ts to v2.**

Per the CopilotKit v2 migration guide: "Your backend does not need any changes. Backend packages (`@copilotkit/runtime`, etc.) — no changes needed. Your `CopilotRuntime` configuration — stays the same."

- Frontend hooks/components: import from `@copilotkit/react-core/v2`
- Styles: `import "@copilotkit/react-core/v2/styles.css"` in layout.tsx
- Exception: `CopilotKit` provider imports from `@copilotkit/react-core` (root)
- Backend: `route.ts` uses `copilotRuntimeNextJSAppRouterEndpoint` + `AnthropicAdapter` + `HttpAgent` (v1 pattern). The `a2ui: {}` option enables A2UI middleware on this v1 runtime — it is NOT a v2-only feature.
- **`@ag-ui/client` MUST match the version bundled by `@copilotkit/runtime`** (currently `0.0.52`). Mismatch causes `HttpAgent` type errors against `AbstractAgent`.

## Feature roadmap

| # | Protocol | Feature | Status |
|---|----------|---------|--------|
| F1 | AG-UI + A2UI | Chat + streaming + A2UI v0.9 surface rendering | in progress (Steps 1–5 done, Step 6 pending) |
| F2 | A2UI | Generative UI — agent chooses viz components, frontend renders via catalog | folded into F1 |
| F3 | AG-UI | Human-in-the-loop store/period selection | not started |
| F4 | MCP | External data source (live industry benchmarks via web MCP) | not started |
| F5 | A2A | AnalystAgent as standalone A2A service | not started |

## Current progress — F1 implementation

The migration from the ad-hoc `save_visualizations() → STATE_SNAPSHOT` pattern to proper A2UI v0.9 surfaces is structured into **6 steps**. Status as of this checkpoint:

| Step | Description | Status |
|------|-------------|--------|
| 1 | Add `copilotkit` Python SDK to `agent/pyproject.toml`; remove viz fields from `AgentState` | DONE |
| 2 | Split agents — extract `data_query.py`, `analyst.py` from orchestrator; move prompts to `agents/prompts/*.md` | DONE |
| 3 | Create `tools/a2ui.py` with `render_surface()`; remove old `save_visualizations` from `tools/analyst.py` | DONE |
| 4 | Wire `render_surface` into both sub-agents via factory functions in `agents/orchestrator.py` | DONE |
| 5 | Frontend `route.ts` — add `a2ui: {}` to `CopilotRuntime`; upgrade `@ag-ui/client` to match runtime's bundled version | DONE |
| 6 | Frontend catalog & rendering — install `@copilotkit/a2ui-renderer`, build catalog, wire `A2UIProvider` + `A2UIRenderer`, refactor `VizPanel`, update `agent-state.ts`, retire `VizRenderer` | PENDING |

### Step 6 sub-plan (next session resumes here)

- 6a — `cd frontend && npm install @copilotkit/a2ui-renderer`
- 6b — Create `frontend/lib/a2ui/catalog.ts` — uses `createCatalog` + `extendsBasicCatalog` to register: `KPICard`, `BarChart`, `LineChart`, `AreaChart`, `PieChart`, `DataTable`, `ComparisonCard`, `InsightBanner`. **MUST build components binding-aware** for Stage 2 readiness.
- 6c — Update `AppShell.tsx` — wrap `{children}` in `<A2UIProvider catalog={biCatalog}>` (inside `CopilotKit`).
- 6d — Refactor `VizPanel.tsx` — remove `visualizations` and `insight` props; replace `VizRenderer` with `<A2UIRenderer surfaceId="bi-dashboard" />`; use `useA2UIState()` to drive empty state.
- 6e — Update `page.tsx` — drop references to `agentState.visualizations` and `agentState.insight`.
- 6f — Update `types/agent-state.ts` — remove `visualizations` and `insight` to mirror the slim Python `AgentState`.
- 6g — Delete `VizRenderer.tsx`. Keep `types/viz.ts` as TypeScript reference only (no runtime use).

### Verified working at this checkpoint

- Backend agent hierarchy builds and runs via `uv run adk web src`
- `render_surface` produces clean A2UI v0.9 output: flat props (no `props` nesting), nulls excluded (`exclude_none=True`), correct adjacency list, correct catalog/surface IDs
- Tested with both DataQueryAgent (KPIs + LineChart) and AnalystAgent paths in ADK web harness
- `route.ts` lints clean after `a2ui: {}` fix; `HttpAgent` lint error resolved by upgrading `@ag-ui/client` to `0.0.52`

### Resume command for next session

> "Resume Step 6 of F1 — frontend A2UI catalog & rendering. Start with sub-step 6a."

Future sessions should read CLAUDE.md → Working Discipline → Current progress, then proceed.

## GitHub

https://github.com/Diz312/gen-ui
