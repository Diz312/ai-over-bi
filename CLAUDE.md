# AI over BI

AI-powered business intelligence for QuickBite restaurant chain — FY2024 performance analysis.
A CopilotKit learning vehicle demonstrating AG-UI → A2UI → MCP → A2A protocol progression.

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
| Figma file → code (when MCP is connected) | `figma:*` skills | `figma-implement-design`, `figma-use`, etc. |
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

---

## What it does

1. Business analyst asks a natural language question via chat
2. OrchestratorAgent (Sonnet) routes intent → DataQueryAgent or AnalystAgent
3. Sub-agents query SQLite, compare periods, benchmark against QSR industry
4. Agent calls `render_surface()` — emits an A2UI v0.9 surface as the tool result
5. CopilotKit's A2UI middleware intercepts the tool result and streams a surface activity message
6. Built-in A2UI renderer (configured via `<CopilotKit a2ui={{ catalog: biCatalog }}>`) renders the surface inline in the chat
7. AnalystAgent emits structured insights (`headline` / `body` / `why` / `sentiment`) shown as the InsightBanner

## Stack

- **Backend**: Python 3.13 + Google ADK + `ag-ui-adk` + `litellm` + FastAPI + SQLite + `copilotkit` (A2UI helpers)
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4 + CopilotKit 1.54.x v2 (frontend) / v2 runtime (backend) + Recharts + `@copilotkit/a2ui-renderer` + Zod 3.x
- **Protocols**: AG-UI (transport) · A2UI v0.9 (declarative UI protocol) · MCP (planned F4) · A2A (planned F5)
- **Models**:
  - Orchestrator → `claude-sonnet-4-6`
  - AnalystAgent → `claude-sonnet-4-6` (`ANALYST_MODEL`)
  - DataQueryAgent → `claude-haiku-4-5-20251001` (`QUERY_MODEL`)
  - CopilotKit "default" peripheral agent → `anthropic/claude-3.5-haiku` (suggestions, CopilotTask)

## Project structure

```
gen-ui/
├── agent/
│   ├── pyproject.toml                       # deps include `copilotkit` for a2ui helpers
│   ├── .env                                 # (gitignored)
│   └── src/
│       └── ai_over_bi/
│           ├── __init__.py                  # root_agent export (needed for adk web)
│           ├── config.py                    # pydantic-settings — ORCHESTRATOR_MODEL, ANALYST_MODEL, QUERY_MODEL
│           ├── logging_config.py            # JSON structured logging → stdout
│           ├── contracts.py                 # SOURCE OF TRUTH — VizPayload union + InsightItem + AgentState (Pydantic)
│           ├── catalog.py                   # SOURCE OF TRUTH — VIZ_CATALOG manifest (description + when_to_use + props_summary per viz)
│           ├── main.py                      # FastAPI app, CORS, lifespan, /health
│           ├── data/
│           │   ├── seed.py                  # Generates store_data.db (uv run ai-over-bi-seed)
│           │   └── store_data.db            # SQLite — 100 stores, FY2024 daily + quarterly
│           ├── agents/
│           │   ├── orchestrator.py          # OrchestratorAgent factory + ADKAgent wrapper
│           │   ├── data_query.py            # DataQueryAgent factory
│           │   ├── analyst.py               # AnalystAgent factory
│           │   ├── prompt_loader.py         # Reads .md, substitutes {viz_catalog} + {metric_display_rules}
│           │   └── prompts/
│           │       ├── orchestrator.md      # routing
│           │       ├── data_query.md        # query patterns + viz selection (uses {viz_catalog})
│           │       ├── analyst.md           # comparison + insights (uses {viz_catalog} + {metric_display_rules})
│           │       └── _metric_display_rules.md  # SHARED — metric formatting rules (currency vs number)
│           └── tools/
│               ├── query.py                 # query_daily_sales, query_quarterly_sales
│               ├── analyst.py               # compare_periods, get_industry_context
│               └── a2ui.py                  # render_surface — ONLY way to push viz to frontend
├── frontend/
│   ├── app/
│   │   ├── api/copilotkit/route.ts          # CPK runtime v2 — HttpAgent + BuiltInAgent + a2ui:{}
│   │   ├── layout.tsx                       # Minimal server component (HTML, fonts, globals.css)
│   │   ├── page.tsx                         # <CopilotKit a2ui={{catalog: biCatalog}}> + <CopilotChat>
│   │   ├── globals.css                      # Tailwind v4 + minimal CPK theme overrides
│   │   └── components/
│   │       └── viz/                         # 8 React viz components — registered in lib/a2ui catalog
│   │           ├── KPICard.tsx              # Single metric — title, value, delta direction (color-coded), sparkline
│   │           ├── BarChart.tsx             # Vertical/horizontal — explicit barSize/maxBarSize
│   │           ├── LineChart.tsx            # Time-series
│   │           ├── AreaChart.tsx            # Filled area, optionally stacked
│   │           ├── PieChart.tsx             # Pie/donut share
│   │           ├── DataTable.tsx            # Sortable, first-row highlight
│   │           ├── ComparisonCard.tsx       # Period-over-period
│   │           └── InsightBanner.tsx        # Sentiment-coded analyst cards (positive/negative/neutral)
│   ├── lib/
│   │   ├── a2ui/                            # A2UI catalog wiring
│   │   │   ├── definitions.ts               # Zod schemas for the 8 components (frontend contract)
│   │   │   ├── renderers.tsx                # Component name → React component
│   │   │   └── catalog.ts                   # createCatalog(definitions, renderers, { catalogId, includeBasicCatalog })
│   │   └── theme/                           # SOURCE OF TRUTH — visual + presentation tokens
│   │       ├── colors.ts                    # 32 named tokens + CHART_COLORS (8) + warnIfChartPaletteOverflow
│   │       ├── typography.ts                # 7 typography tokens (TYPO_P1_BOLD, TYPO_GRAPH_LABEL, etc.)
│   │       ├── effects.ts                   # SHADOW_CARD, BORDER_CARD, BORDER_GRID
│   │       ├── formatters.ts                # formatValue, makeTick (Intl + Recharts axis compaction)
│   │       └── index.ts                     # barrel re-export of all four
│   ├── types/
│   │   ├── viz.ts                           # TypeScript prop interfaces — mirror of contracts.py
│   │   └── agent-state.ts                   # TS mirror of Python AgentState (slim — status/session_id/error)
│   ├── .env.local                           # ANTHROPIC_API_KEY
│   └── package.json
├── docs/
│   ├── 10_fullstack concepts.md
│   ├── 20_adk-copilotkit-primer.md
│   ├── 20_copilotkit-primer.md
│   ├── 21_copilotchat-anatomy.md
│   ├── 30_a2ui-using copilot.md
│   └── 31_maintaining_a2ui_catalog.md       # SOP for adding/modifying/restyling viz components
├── start.sh                                 # One-command bootstrap + start
├── CLAUDE.md                                # This file
└── AGENTS.md                                # Agent architecture deep-dive
```

---

## Agent architecture

```
OrchestratorAgent (ai_over_bi)             — Sonnet, routes intent, no tools of its own
  ├── DataQueryAgent (data_query_agent)    — Haiku: query_daily_sales, query_quarterly_sales, render_surface
  └── AnalystAgent  (analyst_agent)        — Sonnet: compare_periods, get_industry_context, render_surface
```

- **Tools are passed via factory functions** — `build_data_query_agent(render_surface)` and `build_analyst_agent(render_surface)` to avoid circular imports
- **Prompts loaded via `prompt_loader.load_prompt(name)`** — substitutes `{viz_catalog}` and `{metric_display_rules}` at agent build time
- **`render_surface` is the only way to push visualizations to the frontend.** It returns A2UI v0.9 operations as a dict (NOT a stringified JSON — ADK would double-wrap it as `{"result": "..."}`)
- **Insights are structured** — `render_surface` accepts `insights: list[InsightItem] | None` where each item has `headline`, `body`, `why?`, `sentiment` ("positive" | "negative" | "neutral")

### AgentState (slim — STATE_SNAPSHOT only carries UI signals)

```json
{
  "status":     "idle|thinking|querying|analyzing|ready|error",
  "session_id": "...",
  "error":      null
}
```

Visualizations and insights are **NOT** in AgentState. They flow through A2UI surface operations, intercepted by the CPK A2UI middleware before reaching state.

---

## The viz catalog system (multi-dev workflow)

The catalog is the single source of truth that connects backend Pydantic schemas, agent prompts, and the frontend rendering layer. Adding a new viz touches **2 backend files** + 4 frontend files. No hidden duplication.

### Backend layers

| File | Role | Owner |
|------|------|-------|
| `contracts.py` | Pydantic prop schemas — what shapes the agent is allowed to emit | Backend |
| `catalog.py` | `VIZ_CATALOG` manifest — viz_type, component_name, description, when_to_use, props_summary | Backend + product |
| `tools/a2ui.py` | `render_surface()` — validates, builds A2UI ops, returns to runtime. Imports `COMPONENT_BY_VIZ_TYPE` from catalog | Backend |
| `agents/prompts/<agent>.md` | Persona + workflow + role-specific guidance. Uses `{viz_catalog}` placeholder | Prompt eng |
| `agents/prompts/_metric_display_rules.md` | Shared metric formatting rules (currency vs number) | Prompt eng + data |
| `agents/prompt_loader.py` | Substitutes placeholders at agent build time | Backend |

### Frontend layers (mirror of backend prop shapes)

| File | Role |
|------|------|
| `types/viz.ts` | TypeScript prop interfaces |
| `lib/a2ui/definitions.ts` | Zod schemas (catalog validation) |
| `app/components/viz/<Name>.tsx` | The React component |
| `lib/a2ui/renderers.tsx` | Maps catalog component name → React component |
| `lib/a2ui/catalog.ts` | `createCatalog(...)` — combines definitions + renderers, includes `BI_CATALOG_ID` and `BI_SURFACE_ID` |

### Workflow guarantees

- **Adding a new viz type** — append entry in `catalog.py` + Pydantic class in `contracts.py` + 4 frontend files. Selection guidance flows automatically into both agent prompts via `{viz_catalog}` substitution.
- **Modifying selection guidance** — edit one field in `catalog.py`. Both agents pick up the change at next build.
- **Modifying metric formatting rules** — edit `_metric_display_rules.md`. Both agents pick up the change.
- **Restyling an existing component** — edit only the `.tsx` file. No backend changes.

**Detailed SOP:** see `docs/31_maintaining_a2ui_catalog.md` (architecture diagrams, decision tree, scenario-by-scenario walkthroughs, common pitfalls).

---

## A2UI architecture (v0.9, fixed schema)

A2UI is a **declarative UI protocol** — independent from AG-UI. AG-UI is the transport (over which A2UI messages flow); A2UI is the contract for how UI is structured.

### Flow

```
Agent decides what to render
      ↓
render_surface(visualizations, insights)        ← agent/src/ai_over_bi/tools/a2ui.py
      ↓
Pydantic validation (VizPayload union + InsightItem)  ← agent/src/ai_over_bi/contracts.py
      ↓
COMPONENT_BY_VIZ_TYPE lookup                    ← agent/src/ai_over_bi/catalog.py
      ↓
Build A2UI v0.9 component tree (adjacency list)
      ↓
a2ui.render([createSurface, updateComponents])  ← copilotkit Python SDK
      ↓
Return as dict {a2ui_operations: [...]}         (NOT stringified — ADK would re-wrap)
      ↓
ADK function_response → AG-UI TOOL_CALL_RESULT event
      ↓
@ag-ui/a2ui-middleware (server, route.ts: a2ui:{}) parses content, finds a2ui_operations
      ↓
Emits ACTIVITY_SNAPSHOT event of type "a2ui-surface" to the frontend
      ↓
CopilotKit built-in A2UI renderer (configured by <CopilotKit a2ui={{catalog: biCatalog}}>)
      ↓
biCatalog (lib/a2ui/catalog.ts) maps component name → React component
      ↓
Surface renders inline in the chat (CopilotChat activity message)
```

### Catalog and surface IDs (single source of truth)

```python
# agent/src/ai_over_bi/tools/a2ui.py
BI_CATALOG_ID = "https://github.com/Diz312/gen-ui/catalogs/bi/v1"
BI_SURFACE_ID = "bi-dashboard"
```

```typescript
// frontend/lib/a2ui/catalog.ts
export const BI_CATALOG_ID = "https://github.com/Diz312/gen-ui/catalogs/bi/v1";
export const BI_SURFACE_ID = "bi-dashboard";
```

These MUST match between backend and frontend.

### Component tree shape (adjacency list, flat props)

A2UI v0.9 uses an adjacency list — flat array of components, parent references children by ID. Component properties are at the **top level** (NOT nested under `props`).

```json
[
  {"id": "root", "component": "Column", "children": ["insight-banner", "viz-0", "viz-1"]},
  {"id": "insight-banner", "component": "InsightBanner", "insights": [{...}, {...}]},
  {"id": "viz-0", "component": "KPICard", "title": "Net Sales", "value": 18550227.46, "unit": "$", "value_format": "currency"},
  {"id": "viz-1", "component": "LineChart", "title": "...", "data": [...], "series": [...]}
]
```

### Stage 1 (current) vs Stage 2 (future) — incremental updates

**Stage 1 — inline values, full rebuild every call.**
Every `render_surface` call sends `createSurface + updateComponents`. All values are baked inline. No `update_data_model`. Simple, ships fast.

**Stage 2 — data binding for incremental updates.**
For scenarios like "same KPIs, different region," only the data should update — not the component tree. Requires:
1. Catalog components built **binding-aware** — they read props from a data model path when `dataBinding` is set
2. `render_surface` logic to detect "same structure, new data" and emit only `update_data_model`
3. A defined data-model schema (e.g. `/kpis/net_sales`)

### What does NOT use data binding (per A2UI v0.9 spec)

The A2UI SDK is explicit: data binding (`{ "path": "..." }`) is for **interactive form inputs** (TextField values, button action contexts). Using it on display properties that don't declare path support in their schema causes a runtime crash. For BI display use **inline literals**.

---

## Frontend architecture

### Layout

The frontend is intentionally minimal — two files at the top of `app/`:

- **`layout.tsx`** — server component, sets HTML/body/fonts, imports `globals.css`. No CopilotKit logic here (would force `"use client"` and break `metadata` export).
- **`page.tsx`** — client component, hosts the CopilotKit provider with the A2UI catalog wired in:
  ```tsx
  <CopilotKit
    runtimeUrl="/api/copilotkit"
    agent="ai_over_bi"
    a2ui={{ catalog: biCatalog }}
  >
    <CopilotChat agentId="ai_over_bi" className="h-full" />
  </CopilotKit>
  ```

A2UI surfaces render **inline in the chat** as activity messages — the CPK built-in A2UI renderer activates automatically when `a2ui.catalog` is provided AND the runtime has `a2ui:{}`.

### Theme module (single source of truth for presentation tokens)

```
lib/theme/
├── colors.ts        32 named tokens (Brand, Secondary, Accents, Charts, Semantic, Backfills, Borders)
│                    + CHART_COLORS (8-color palette)
│                    + warnIfChartPaletteOverflow(componentName, count)
├── typography.ts    7 typography tokens (TYPO_P1_BOLD, TYPO_P1_REGULAR, TYPO_P2_BOLD, TYPO_P2_REGULAR,
│                    TYPO_BIG_NUMBER, TYPO_GRAPH_LABEL, TYPO_GRAPH_LABEL_BOLD)
├── effects.ts       SHADOW_CARD, BORDER_CARD, BORDER_GRID
├── formatters.ts    formatValue (number/currency/percentage/raw), makeTick (Recharts axis compaction)
└── index.ts         barrel re-export — components import from `@/lib/theme`
```

**Single import line** per viz component covers colors + typography + effects + formatters:

```ts
import {
  BACKFILL_GREEN, SECONDARY_BLACK, SHADOW_CARD,
  TYPO_P1_BOLD, formatValue,
} from "@/lib/theme";
```

### Chart palette overflow

`CHART_COLORS` has 8 entries. Series indices use `idx % CHART_COLORS.length`, so series 9+ silently cycle. Each chart calls `warnIfChartPaletteOverflow(name, count)` at the top of its component body — dev-mode console warning when count exceeds 8. Production builds skip the check.

### `BRAND_RED` is reserved

`BRAND_RED` (#D90007) carries semantic meaning ("negative" direction in KPICard / ComparisonCard). It is intentionally NOT in `CHART_COLORS` so a chart series can never compete with that signal.

---

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

# Backend lint + type check
cd agent && uv run ruff check src/ && uv run mypy src/

# Frontend type check
cd frontend && npx tsc --noEmit
```

## Environment

**agent/.env** (copy from agent/.env.example):
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com

**frontend/.env.local** (copy from frontend/.env.local.example):
- `ANTHROPIC_API_KEY` — same key, used by the v2 `BuiltInAgent` for peripheral CPK ops (suggestions, etc.)

## Ports

- Frontend: http://localhost:3000
- Backend agent: http://localhost:8000
- Health check: http://localhost:8000/health
- Swagger UI: http://localhost:8000/docs

---

## CopilotKit — MANDATORY

**Both frontend and backend now use the v2 API.**

### Frontend (v2)

- All hooks/components import from `@copilotkit/react-core/v2`
- The `CopilotKit` provider is imported from `@copilotkit/react-core/v2` (NOT root) — the v2 alias is what supports the `a2ui={{ catalog }}` prop
- Styles: `import "@copilotkit/react-core/v2/styles.css"` in `layout.tsx`

### Backend (v2)

- `route.ts` imports from `@copilotkit/runtime/v2`:
  - `CopilotRuntime` (v2 surface — accepts `a2ui` middleware option)
  - `BuiltInAgent` (wraps an LLM directly as an agent — replaces `AnthropicAdapter`)
  - `InMemoryAgentRunner` (required in v2 to drive agent execution)
  - `createCopilotRuntimeHandler` (replaces `copilotRuntimeNextJSAppRouterEndpoint`)
- `HttpAgent` still comes from `@ag-ui/client` (unchanged), points at the ADK backend at `http://localhost:8000/agent`
- Two registered agents:
  - `ai_over_bi` — `HttpAgent` to the ADK backend (the BI agent hierarchy)
  - `default` — `BuiltInAgent({ model: "anthropic/claude-3.5-haiku" })` for peripheral CPK ops
- `mode: "single-route"` — only `POST` export needed at `/api/copilotkit/route.ts`
- `a2ui: {}` enables the A2UI middleware that intercepts tool results

### Version pin

- **`@ag-ui/client` MUST match the version bundled by `@copilotkit/runtime`** (currently `0.0.52`). Mismatch causes `HttpAgent` type errors against `AbstractAgent`.
- **Zod must be v3** (currently `^3.25.75`). `@copilotkit/a2ui-renderer` was built against Zod 3 and is incompatible with Zod 4's type system (`$strip` vs `UnknownKeysParam`).

---

## Project documentation

`docs/`:
- `10_fullstack concepts.md` — fullstack primer
- `20_adk-copilotkit-primer.md` — ADK + CopilotKit integration patterns
- `20_copilotkit-primer.md` — CopilotKit v2 primer
- `21_copilotchat-anatomy.md` — CopilotChat component anatomy
- `30_a2ui-using copilot.md` — A2UI integration with CopilotKit
- `31_maintaining_a2ui_catalog.md` — **SOP** for adding/modifying/restyling viz components (read this before any viz work)

## GitHub

https://github.com/Diz312/gen-ui
