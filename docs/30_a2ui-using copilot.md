# A2UI Learning Plan

> Source: https://a2ui.org — scraped 2026-04-29  
> Approach: Learn each concept hands-on by extending this project. Every milestone maps to a feature (F1–F5) already in your roadmap.

---

## Two specs — know the difference

| Spec | What it is | Role in this project |
|---|---|---|
| **A2UI** | A declarative UI protocol. Defines how agent responses are structured as JSON and how those structures are paired with frontend components for visualization. | The protocol the agents will use to describe UI output |
| **AG-UI** | A transport protocol. One of A2UI's supported transports for moving agent state and messages to the frontend. | Currently used via CopilotKit to stream `STATE_SNAPSHOT` to the frontend |

They are independent specs. AG-UI is not a subset of A2UI — it is one of several transports A2UI can run over. The others listed in the A2UI spec are: A2A Protocol, SSE, WebSockets, and custom JSON-capable transports.

In this project: agents will produce **A2UI-structured responses**, and those responses will travel to the frontend over the **AG-UI transport** (via CopilotKit).

---

## What is A2UI?

**A2UI (Agent to UI)** is a **declarative UI protocol** that defines how AI agents structure their UI output as JSON, and how a client renderer maps that JSON to native components.

The agent never executes code on the client. It emits structured JSON. The client controls rendering, styling, and security.

### Why it matters vs. plain text agents

| Problem with text-only agents | A2UI solution |
|---|---|
| Users need multiple back-and-forth turns to fill a form | Agent emits a rendered form definition in one shot |
| Remote/multi-agent systems can't touch the DOM directly | Agent emits declarative JSON; client owns rendering |
| HTML/iframe injection is a security and styling nightmare | Declarative data — no executable code, inherits app styling |

### Core design principles

1. **LLM-Friendly** — Flat, ID-referenced component lists; LLMs can stream them incrementally
2. **Framework-Agnostic** — Same JSON renders in React, Angular, Lit, Flutter, native mobile
3. **Separation of Concerns** — UI structure is separate from application state
4. **Secure by Design** — Client controls styling and sandboxing; agents cannot inject arbitrary code

---

## Architecture in one diagram

```
User message
    │
    ▼
OrchestratorAgent  ──►  DataQueryAgent / AnalystAgent
    │                         │
    │                    Tool calls
    │                    (query_daily_sales, compare_periods, save_visualizations)
    │
    │   Agent produces A2UI-structured JSON (the protocol)
    │
    ▼
AG-UI transport  ◄── one of A2UI's supported transports; used here via CopilotKit
    │
    ▼
Frontend (Next.js)
    │
    ▼
VizRenderer → KPICard | BarChart | ...
```

Today, agents produce an ad-hoc `VizPayload[]` inside a `STATE_SNAPSHOT`. Learning A2UI means understanding the formal protocol that replaces that ad-hoc structure — the messages still travel over AG-UI.

---

## A2UI protocol core — five concepts you must know

### 1. Surfaces

A **surface** is a named canvas/container for one logical UI (e.g., a dashboard, a form, a result card).

```json
// v0.9 — agent creates a surface
{ "createSurface": { "surfaceId": "quarterly-dashboard", "catalogId": "https://yourapp.com/catalogs/bi/v1/catalog.json" } }
```

A surface has a lifecycle: `createSurface` → `updateComponents` → `updateDataModel` → (user action) → `deleteSurface`.

### 2. Components — adjacency list model

Components are a **flat array** (not nested). Each references its children by ID. This is how LLMs can stream components incrementally without backtracking.

```json
// v0.9 updateComponents
{
  "updateComponents": [
    { "id": "root",     "component": "Column",  "children": ["kpi-row", "chart"] },
    { "id": "kpi-row",  "component": "Row",     "children": ["kpi-sales", "kpi-guests"] },
    { "id": "kpi-sales","component": "KPICard", "props": { "label": "Net Sales", "value": { "path": "/kpi/sales" } } }
  ]
}
```

Every component: `id` (unique), `component` (type from catalog), `props` (type-specific).

### 3. Data model & data binding

**Structure** (component tree) is separate from **state** (data values). Data binding uses JSON Pointer paths (RFC 6901).

```json
// Agent sends data separately — no need to regenerate layout
{ "updateDataModel": { "/kpi/sales": "$2.4M", "/kpi/guests": "18,400" } }
```

Components declare bindings: `{ "path": "/kpi/sales" }` — client reactively updates when the path changes.  
Inputs write back: user types in a TextField bound to `/filters/region` → local model updates synchronously before any action fires.

### 4. Catalogs

A **catalog** is a JSON Schema that defines exactly which components, their props, and their types an agent may use. It is the contract between agent and renderer.

- **Basic Catalog** — pre-built by the A2UI team; good for prototypes
- **Custom Catalog** — production; maps to your design system (e.g., your existing KPICard, BarChart, ComparisonCard)
- Catalog negotiation: client advertises `supportedCatalogIds` → agent picks the best match → locked for that surface's lifetime

### 5. Actions

Two kinds of user interactions:

| Kind | Keyword | Who handles it | Use case |
|---|---|---|---|
| Function | `functionCall` | Renderer locally (no network) | Open URL, local validation |
| Event | `event` | Agent (via transport) | Form submit, filter change |

Events carry a `context` — a hand-picked subset of the data model:

```json
{
  "event": { "name": "filter-changed", "context": { "region": { "path": "/filters/region" } } }
}
```

The local data model is always updated synchronously before the event fires — no race conditions.

---

## A2UI message types reference

### v0.8 (stable)

| Message | Purpose |
|---|---|
| `surfaceUpdate` | Define/update component tree |
| `dataModelUpdate` | Update application state |
| `beginRendering` | Signal client to render (after all definitions sent) |
| `deleteSurface` | Remove a surface |

### v0.9 (draft — cleaner syntax, target for new work)

| Message | Purpose |
|---|---|
| `createSurface` | Create surface + declare catalog |
| `updateComponents` | Add/modify components (flatter format) |
| `updateDataModel` | Update state (plain JSON paths) |
| `deleteSurface` | Remove a surface |

---

## A2UI transport options

A2UI is transport-agnostic. The same protocol messages can travel over any of these:

| Transport | Status in A2UI spec | Role in this project |
|---|---|---|
| **AG-UI** | Stable | Active now (F1, F2) — CopilotKit uses AG-UI to stream state to frontend |
| **A2A Protocol** | Stable | Planned (F5) — wraps A2UI as `application/json+a2ui` DataPart |
| SSE | Proposed | Not used — AG-UI covers this need |
| WebSockets | Proposed | Not used |
| Custom | Supported | Not used |

---

## Learning milestones — tied to your feature roadmap

Each milestone is a concrete deliverable you build in this project. Do them in order.

---

### Milestone 1 — Understand what you already have (F1)

**Concept covered:** What A2UI is; how the current project relates to it; AG-UI as the active transport

**What to read/do:**
1. Read [a2ui.org — What is A2UI?](https://a2ui.org/introduction/what-is-a2ui) (~10 min)
2. Read [a2ui.org — Data Flow](https://a2ui.org/concepts/data-flow) (~15 min)
3. Trace the current flow in this project:
   - `agent/src/ai_over_bi/tools/analyst.py` → `save_visualizations()` → `AgentState.visualizations`
   - `frontend/app/api/copilotkit/route.ts` → CopilotRuntime → AG-UI transport → `STATE_SNAPSHOT`
   - `frontend/app/components/VizRenderer.tsx` → dispatches on `vizType`

**Key insight to lock in:** The current `VizPayload[]` in `STATE_SNAPSHOT` is an ad-hoc UI description — it does the same job A2UI formalizes with surfaces, typed messages, catalogs, and data binding. The AG-UI transport stays; what changes is the structure of what travels over it.

---

### Milestone 2 — Components and the adjacency list (F2)

**Concept covered:** A2UI component structure, flat lists, static vs dynamic children

**What to read/do:**
1. Read [a2ui.org — Components](https://a2ui.org/concepts/components) (~15 min)
2. Study the Basic Catalog component list:
   - **Content**: Text, Image, Icon, Divider
   - **Layout**: Row, Column, List, Card, Tabs, Modal
   - **Input**: Button, CheckBox, TextField, DateTimeInput, MultipleChoice, Slider
3. Map your existing viz components to catalog equivalents:

| Your component | A2UI Basic Catalog equivalent |
|---|---|
| KPICard | Card + Text (custom catalog candidate) |
| BarChart | Custom (Recharts — needs custom catalog) |
| LineChart | Custom |
| DataTable | List + Row |
| ComparisonCard | Card + Row + custom |

4. Sketch what a `quarterly-dashboard` surface would look like as an adjacency list of your components.

**Key insight to lock in:** Your viz components are good candidates for a **custom catalog** — they map 1:1 to your design system. The Basic Catalog is for prototypes.

---

### Milestone 3 — Data binding and reactive state (F2)

**Concept covered:** JSON Pointer paths, structure vs state separation, reactive updates, dynamic lists

**What to read/do:**
1. Read [a2ui.org — Data Binding](https://a2ui.org/concepts/data-binding) (~15 min)
2. In your project, note how `VizPayload` carries both structure (chart type) and data (values array) together — they're coupled.
3. Identify which parts of a `BarChartProps` are **structure** vs **state**:
   - Structure: `xDataKey`, `bars[]` definitions, axis labels
   - State: the actual numeric values in `data[]`
4. Rewrite one `VizPayload` mentally as separated `updateComponents` + `updateDataModel` A2UI messages.

**Key insight to lock in:** Separating structure from state means the agent can update chart data without re-sending the entire component tree — crucial for streaming and incremental updates.

---

### Milestone 4 — Define your custom catalog (F3 — Human-in-the-loop)

**Concept covered:** A2UI catalogs, JSON Schema contracts, catalog negotiation, versioning

**What to build:**
1. Read [a2ui.org — Catalogs](https://a2ui.org/concepts/catalogs) (~20 min)
2. Create `agent/src/ai_over_bi/catalog/bi_catalog.json`:
   - `catalogId`: `"https://github.com/Diz312/gen-ui/catalogs/bi/v1/catalog.json"`
   - Components: `KPICard`, `BarChart`, `LineChart`, `AreaChart`, `DataTable`, `ComparisonCard`
   - Each component gets a JSON Schema for its props (mirrors your TypeScript `viz.ts` types)
3. Include this catalog in the agent's system prompt context
4. Wire catalog negotiation: frontend advertises `supportedCatalogIds` in the AG-UI message metadata so the agent knows what the renderer can handle

**Key insight to lock in:** The catalog is the single source of truth for the agent-renderer contract. Once an agent picks a catalog for a surface, it is locked for that surface's lifetime.

---

### Milestone 5 — Actions and human-in-the-loop (F3)

**Concept covered:** A2UI actions, events, function calls, local state sync, form submission pattern

**What to read/do:**
1. Read [a2ui.org — Actions](https://a2ui.org/concepts/actions) (~20 min)
2. Design the F3 human-in-the-loop interaction (store/period selection):
   - **Surface**: A filter panel
   - **Components**: `MultipleChoice` (stores), `DateTimeInput` (period), `Button` (apply)
   - **Data model**: `/filters/stores[]`, `/filters/period/start`, `/filters/period/end`
   - **Event**: `"filter-applied"` with context `{ "stores": { "path": "/filters/stores" }, "period": { "path": "/filters/period" } }`
3. Implement in the agent: handle the `filter-applied` event → re-run `query_daily_sales` → emit updated `updateDataModel`
4. Implement in the frontend: render the filter surface; dispatch events back to the agent via AG-UI transport

**Key insight to lock in:** The synchronous local-model-update guarantee means filter values are always consistent in the event context — no async race between user input and button click.

---

### Milestone 6 — MCP integration for live data (F4)

**Concept covered:** A2UI transport extensibility, MCP as a data source, surface lifecycle

**What to read/do:**
1. Read [a2ui.org — Transports](https://a2ui.org/concepts/transports) (~10 min)
2. Understand the planned pattern:
   - MCP tool exposes live industry benchmark data
   - `AnalystAgent` calls MCP tool → gets benchmark JSON → emits A2UI `updateDataModel` for the benchmark surface
   - No layout regeneration needed — only state changes because structure and state are separated
3. Plan which surfaces receive MCP-fed data:
   - `industry-benchmark` surface — a ComparisonCard showing QSR vs QuickBite metrics
   - Data model paths: `/benchmark/qsr_avg_check`, `/benchmark/qsr_net_sales_growth`
4. Design the MCP tool output schema so it maps cleanly to your catalog's `ComparisonCardProps`

**Key insight to lock in:** A2UI's structure/state separation pays off here — the agent writes new values to data model paths without touching the component tree. The AG-UI transport carries those `updateDataModel` messages to the frontend unchanged.

---

### Milestone 7 — A2A multi-agent architecture (F5)

**Concept covered:** A2A as an A2UI transport, surface ownership, metadata stripping, orchestrator routing

**What to read/do:**
1. Read [a2ui.org — Transports (A2A section)](https://a2ui.org/concepts/transports) (~10 min)
2. Read [a2ui.org — Actions (Orchestration & Multi-Agent Routing section)](https://a2ui.org/concepts/actions)
3. Understand the surface ownership pattern under A2A:
   - `OrchestratorAgent` records `surfaceId → sub-agent` when `createSurface` is received
   - Incoming A2UI `action` messages are routed to the owning sub-agent via `surfaceId`
   - Orchestrator **strips** `a2uiClientDataModel` metadata before forwarding to prevent data leakage between agents
4. Design your F5 architecture:
   - `AnalystAgent` becomes a standalone A2A service
   - A2UI messages wrap as A2A `DataPart` with `mimeType: application/json+a2ui`
   - OrchestratorAgent owns the `analyst-insight` surface routing table
5. Plan security: implement `a2uiClientDataModel` stripping in the orchestrator interceptor

**Key insight to lock in:** When switching from AG-UI to A2A as the transport for AnalystAgent, the A2UI protocol messages themselves do not change — only the envelope changes. That is the value of transport-agnostic protocol design.

---

## Concepts quick-reference card

| Concept | One-liner | Where in your code |
|---|---|---|
| Surface | Named A2UI canvas with lifecycle | Maps to a `VizPayload[]` group today; will be explicit `surfaceId` |
| Component | Flat adjacency list node | Your `viz/KPICard.tsx`, `viz/BarChart.tsx` etc. |
| Catalog | A2UI JSON Schema contract for components | To be created in Milestone 4 |
| Data model | Per-surface A2UI state tree | Currently baked into `VizPayload.props` |
| Data binding | JSON Pointer path from component to model | `{ "path": "/kpi/net_sales" }` |
| Action/Event | User interaction → agent (via transport) | Will replace current "re-ask" pattern for filters |
| AG-UI | Transport carrying A2UI messages to frontend | CopilotKit — active now in F1/F2 |
| A2A | Alternative transport for multi-agent systems | Planned for F5 |
| Renderer | Maps A2UI component type → framework widget | Your `VizRenderer.tsx` dispatch switch |

---

## A2UI spec versions in this project

| Version | Status | Use |
|---|---|---|
| v0.8 | Stable | Reference for existing patterns; what most tooling implements today |
| v0.9 | Draft | Target for new surfaces you build in F3+ (cleaner, flatter syntax) |

v0.8 uses `surfaceUpdate` / `dataModelUpdate` / `beginRendering`. v0.9 uses `createSurface` / `updateComponents` / `updateDataModel`. Same protocol, different message naming.

---

## Key references

| Resource | URL |
|---|---|
| A2UI home | https://a2ui.org |
| Quickstart | https://a2ui.org/quickstart |
| What is A2UI | https://a2ui.org/introduction/what-is-a2ui |
| Concepts: Overview | https://a2ui.org/concepts/overview |
| Concepts: Data Flow | https://a2ui.org/concepts/data-flow |
| Concepts: Components | https://a2ui.org/concepts/components |
| Concepts: Data Binding | https://a2ui.org/concepts/data-binding |
| Concepts: Catalogs | https://a2ui.org/concepts/catalogs |
| Concepts: Transports | https://a2ui.org/concepts/transports |
| Concepts: Actions | https://a2ui.org/concepts/actions |
| Guide: Client Setup | https://a2ui.org/guides/client-setup |
| Guide: Agent Development | https://a2ui.org/guides/agent-development |
| Guide: Renderer Development | https://a2ui.org/guides/renderer-development |
| GitHub | https://github.com/google/A2UI |
