# AI over BI — System Architecture

AI-powered business intelligence for QuickBite restaurant chain. Business analysts ask natural-language questions via a CopilotKit chat frontend; a Google ADK multi-agent backend queries SQLite, computes period comparisons, benchmarks against QSR industry data, and streams typed `VizPayload[]` to the frontend, which renders the right chart or table components automatically.

## Component overview

```mermaid
flowchart TB
    subgraph B["Browser"]
        PROV["CopilotKit Provider<br/>runtimeUrl: /api/copilotkit<br/>agent: ai_over_bi<br/>Path: app/components/AppShell.tsx"]
        CHAT["CopilotChat (v2 API)<br/>agentId: ai_over_bi<br/>Path: app/page.tsx"]
        AGT["useAgent()<br/>agentId: ai_over_bi<br/>→ reads AgentState"]
        VIZ["VizPanel<br/>insight banner + VizRenderer<br/>Path: app/components/VizPanel.tsx"]
        REND["VizRenderer<br/>dispatches vizType → component<br/>Path: app/components/VizRenderer.tsx"]
        PROV --> CHAT
        PROV --> AGT
        AGT -->|"agentState.visualizations<br/>agentState.insight<br/>agentState.status"| VIZ
        VIZ --> REND
    end

    subgraph S["Next.js server"]
        RT["CopilotRuntime<br/>Path: app/api/copilotkit/route.ts"]
        HA["HttpAgent<br/>target: localhost:8000/agent<br/>name: ai_over_bi"]
        AA["AnthropicAdapter<br/>Model: claude-haiku-4-5-20251001<br/>(suggestions + peripheral ops)"]
        RT --> HA
        RT --> AA
    end

    subgraph A["ADK backend  :8000"]
        FAPI["FastAPI app<br/>POST /agent · GET /health · GET /routes<br/>Path: main.py"]
        ADKW["ADKAgent wrapper<br/>app_name: ai_over_bi<br/>use_in_memory_services: true"]
        ORC["OrchestratorAgent (ai_over_bi)<br/>Model: claude-sonnet-4-6<br/>Path: agents/orchestrator.py"]
        DQA["DataQueryAgent<br/>Model: claude-haiku-4-5-20251001"]
        ANA["AnalystAgent<br/>Model: claude-sonnet-4-6"]
        FAPI --> ADKW
        ADKW --> ORC
        ORC --> DQA
        ORC --> ANA
    end

    subgraph DB["Data"]
        SQL["SQLite<br/>store_data.db<br/>100 stores · FY2024<br/>daily_sales + quarterly_sales"]
    end

    ANT["Anthropic API"]

    CHAT -->|"HTTP POST /api/copilotkit"| RT
    HA -->|"AG-UI SSE stream"| FAPI
    AA -->|"suggestions / CopilotTask"| ANT
    ORC -->|"LiteLLM → anthropic/*"| ANT
    DQA -->|"LiteLLM → anthropic/*"| ANT
    ANA -->|"LiteLLM → anthropic/*"| ANT
    DQA -->|"query_daily_sales<br/>query_quarterly_sales"| SQL
    ANA -->|"compare_periods"| SQL

    classDef browser fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef server fill:#f1f5f9,stroke:#475569,color:#0f172a
    classDef backend fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef data fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef external fill:#fce7f3,stroke:#db2777,color:#831843

    class PROV,CHAT,AGT,SUGG,VIZ,REND browser
    class RT,HA,AA server
    class FAPI,ADKW,ORC,DQA,ANA backend
    class SQL data
    class ANT external
```

> **Key point:** `/api/copilotkit` is a Next.js App Router API route running server-side.
> `CopilotRuntime` proxies all agent traffic via `HttpAgent` — the browser never talks
> directly to the ADK backend. The `AnthropicAdapter` is a separate, parallel path
> used exclusively for CopilotKit peripheral operations (suggestions, `CopilotTask`).

## Request paths

There are two separate paths through the runtime:

| Path | Trigger | Transport | Destination |
|------|---------|-----------|-------------|
| Agent messages | User sends a chat message | `HttpAgent` → AG-UI SSE stream | ADK backend `localhost:8000/agent` |
| Peripheral ops | Suggestion generation, `CopilotTask` | Direct HTTP | Anthropic API (Haiku) |

The two paths share the same `CopilotRuntime` instance but never cross. All agent reasoning, tool execution, and state mutations happen in the ADK backend. CopilotKit's Haiku adapter is only for UI-layer LLM operations.

## Protocol stack

```mermaid
flowchart LR
    A["Browser<br/>CopilotChat (v2)"] -->|"HTTP POST /api/copilotkit"| B["CopilotRuntime<br/>Next.js server"]
    B -->|"AG-UI SSE stream<br/>POST /agent"| C["FastAPI + ADKAgent<br/>:8000"]
    C -->|"delegates intent"| D["OrchestratorAgent"]
    D -->|"sub-agent call"| E["DataQueryAgent<br/>or AnalystAgent"]
    E -->|"STATE_SNAPSHOT<br/>events"| B
    B -->|"streamed state updates"| A
```

Three protocols span the full F1–F5 roadmap:

- **AG-UI** — streaming event bus between CopilotKit and the ADK agent (F1–F3, currently active)
- **MCP** — attach external tool servers to ADK agents as toolsets (F4 — planned)
- **A2A** — promote `AnalystAgent` to a standalone networked service (F5 — planned)

See [protocols.md](./protocols.md) for full sequence diagrams per protocol.

## Agent hierarchy and routing

```mermaid
flowchart TD
    USER["Business Analyst<br/>natural-language question"]
    ORC["OrchestratorAgent<br/>ai_over_bi · Sonnet 4.6<br/>intent classification + routing"]
    DQA["DataQueryAgent<br/>data_query_agent · Haiku 4.5<br/>raw data retrieval + visualization build"]
    ANA["AnalystAgent<br/>analyst_agent · Sonnet 4.6<br/>comparison + benchmarking + insight"]

    USER --> ORC

    ORC -->|"'show / display / list / what are'<br/>→ data display intent"| DQA
    ORC -->|"'compare / analyze / explain /<br/>benchmark / why'"| ANA
    ORC -->|"ambiguous intent"| ORC

    DQA -->|"query_daily_sales"| SQL1[("SQLite<br/>daily_sales")]
    DQA -->|"query_quarterly_sales"| SQL2[("SQLite<br/>quarterly_sales")]
    DQA -->|"save_visualizations"| STATE

    ANA -->|"compare_periods"| SQL2
    ANA -->|"get_industry_context"| BENCH["Static QSR<br/>benchmarks"]
    ANA -->|"save_visualizations"| STATE

    STATE["tool_context.state<br/>STATE_SNAPSHOT → frontend"]

    classDef agent fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef db fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef state fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    class ORC,DQA,ANA agent
    class SQL1,SQL2,BENCH db
    class STATE state
```

### Routing rules (OrchestratorAgent)

| Intent signal | Target sub-agent |
|---------------|-----------------|
| "Show me", "display", "list", "what are", "give me" | `data_query_agent` |
| "Compare", "analyze", "explain", "benchmark", "why", "how did X vs Y" | `analyst_agent` |
| Ambiguous | One clarifying question, max |

### DataQueryAgent tools

| Tool | group_by options | Sets status |
|------|-----------------|-------------|
| `query_daily_sales(date_from, date_to, regions, store_ids, group_by)` | `day \| week \| month \| store \| region` | `"querying"` |
| `query_quarterly_sales(quarters, regions, store_ids, group_by)` | `quarter \| store \| region` | `"querying"` |
| `save_visualizations(visualizations, insight)` | — | `"ready"` |

Both query tools return `{"rows": [...], "row_count": int}` where every row has a `label` column (aliased in SQL) plus `net_sales`, `guest_count`, `avg_check`.

### AnalystAgent tools

| Tool | Purpose | Sets status |
|------|---------|-------------|
| `compare_periods(metric, period1_quarters, period1_label, period2_quarters, period2_label, level, regions)` | Period-over-period delta at total / region / store level | `"analyzing"` |
| `get_industry_context(metric, period)` | Static QSR benchmarks + seasonality index + driving factors | — |
| `save_visualizations(visualizations, insight)` | Validate + persist VizPayload[] to state | `"ready"` |

`compare_periods` returns `{comparisons: [{label, period1_value, period2_value, abs_delta, pct_delta, direction}]}`. For `level="store"` it caps at top-20 stores by period2 metric.

`get_industry_context` returns static benchmarks (e.g., QSR avg quarterly per store, comp sales benchmark %, seasonality index by quarter, driving factors). Extension point for F4/MCP — replace the static return with a live Tavily web search without changing the AnalystAgent instruction.

## AG-UI state lifecycle

```mermaid
sequenceDiagram
    participant U as Browser<br/>(CopilotChat)
    participant CK as CopilotRuntime<br/>(Next.js server)
    participant ADK as ADK Backend<br/>(:8000/agent)
    participant DB as SQLite

    U->>CK: POST /api/copilotkit
    CK->>ADK: AG-UI SSE stream (RunAgentInput)

    ADK->>ADK: OrchestratorAgent classifies intent
    ADK-->>CK: STATE_SNAPSHOT {status: "thinking"}
    CK-->>U: state update streamed

    alt Data display query
        ADK->>DB: query_daily_sales / query_quarterly_sales
        ADK-->>CK: STATE_SNAPSHOT {status: "querying"}
        CK-->>U: state update streamed
    else Analysis / comparison
        ADK->>DB: compare_periods
        ADK-->>CK: STATE_SNAPSHOT {status: "analyzing"}
        CK-->>U: state update streamed
        ADK->>ADK: get_industry_context (in-memory)
    end

    ADK->>ADK: save_visualizations (Pydantic validation)
    ADK-->>CK: STATE_SNAPSHOT {status: "ready", visualizations: [...], insight: "..."}
    CK-->>U: final state update

    Note over U: useAgent() reads agentState<br/>VizPanel re-renders with new vizualizations
```

### State fields

| Field | Type | Updated by |
|-------|------|------------|
| `status` | `"idle" \| "thinking" \| "querying" \| "analyzing" \| "ready" \| "error"` | Each tool call, `save_visualizations` sets `"ready"` |
| `session_id` | `string \| null` | First query tool call |
| `visualizations` | `VizPayload[]` | `save_visualizations` only |
| `insight` | `string \| null` | `save_visualizations` only |
| `error` | `string \| null` | `save_visualizations` (validation errors) |

## VizPayload contract architecture

```mermaid
flowchart LR
    subgraph PY["Python (agent/)"]
        C["contracts.py<br/>Pydantic models"]
        SV["save_visualizations()<br/>TypeAdapter validation<br/>tools/analyst.py"]
    end

    subgraph TS["TypeScript (frontend/)"]
        VT["types/viz.ts<br/>TypeScript interfaces"]
        VR["VizRenderer.tsx<br/>vizType dispatch"]
    end

    subgraph COMPS["Viz components (frontend/app/components/viz/)"]
        KC["KPICard.tsx"]
        BC["BarChart.tsx"]
        LC["LineChart.tsx"]
        AC["AreaChart.tsx"]
        PC["PieChart.tsx"]
        DT["DataTable.tsx"]
        CC["ComparisonCard.tsx"]
    end

    C -->|"mirrors"| VT
    SV -->|"validated VizPayload[]<br/>→ tool_context.state<br/>→ AG-UI STATE_SNAPSHOT"| VR
    VR -->|"kpi_card"| KC
    VR -->|"bar_chart"| BC
    VR -->|"line_chart"| LC
    VR -->|"area_chart"| AC
    VR -->|"pie_chart"| PC
    VR -->|"data_table"| DT
    VR -->|"comparison_card"| CC

    classDef pynode fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef tsnode fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef comp fill:#f1f5f9,stroke:#475569,color:#0f172a
    class C,SV pynode
    class VT,VR tsnode
    class KC,BC,LC,AC,PC,DT,CC comp
```

### VizPayload discriminated union

| `vizType` | Props key fields | Typical use |
|-----------|-----------------|-------------|
| `kpi_card` | `title, value, unit, value_format, delta?, trend?` | Single metric summary; delta badge + sparkline |
| `comparison_card` | `title, metric, current, prior, delta, insight?` | Period-over-period — leads analyst responses |
| `bar_chart` | `data[{label,…}], series[], layout, value_format` | Store/region rankings (`layout="horizontal"`), quarterly breakdown |
| `line_chart` | `data[{label,…}], series[], show_dots, value_format` | Monthly / weekly trends |
| `area_chart` | `data[{label,…}], series[], stacked, value_format` | Cumulative or stacked time-series |
| `pie_chart` | `data[{label,value}], inner_radius, value_format` | Sales mix by region (donut: `inner_radius=60`) |
| `data_table` | `columns[{key,label,type,align}], rows[]` | Full detail drilldown — always included alongside charts |

**Invariant:** every `data` row in bar / line / area charts must use `"label"` as the category key. SQL queries alias the grouping column to `label` automatically. Invalid payloads are rejected by Pydantic inside `save_visualizations` — they do not crash the agent; `rejected > 0` is surfaced back to the LLM.

**Swap contract:** replacing Recharts with Nivo only requires editing component internals in `frontend/app/components/viz/*.tsx`. The `VizPayload` types and `VizRenderer` dispatch logic are not touched.

## Data layer

```mermaid
erDiagram
    stores {
        int store_id PK
        string store_name
        string region
        string city
        string state
    }
    daily_sales {
        int store_id FK
        date date
        float net_sales
        int guest_count
        float avg_check
    }
    quarterly_sales {
        int store_id FK
        int fiscal_year
        string quarter
        float net_sales
        int guest_count
        float avg_check
    }
    stores ||--o{ daily_sales : "has"
    stores ||--o{ quarterly_sales : "has"
```

| Table | Rows | Notes |
|-------|------|-------|
| `stores` | 100 | 5 regions: Northeast, Southeast, Midwest, Southwest, West |
| `daily_sales` | 36,600 | Jan 1 – Dec 31 2024; day-of-week + monthly seasonality patterns |
| `quarterly_sales` | 400 | Q1–Q4 2024 pre-aggregated per store (100 stores × 4 quarters) |

Metrics throughout: `net_sales` (USD revenue), `guest_count` (visit count — never currency-formatted), `avg_check` (USD per guest).

Database path: `agent/src/ai_over_bi/data/store_data.db` — generated once via `uv run ai-over-bi-seed`.

## Configuration

| Setting | Default | Env override |
|---------|---------|-------------|
| `ORCHESTRATOR_MODEL` | `claude-sonnet-4-6` | `ORCHESTRATOR_MODEL` |
| `SUBAGENT_MODEL` | `claude-haiku-4-5-20251001` | `SUBAGENT_MODEL` |
| `DB_PATH` | `…/data/store_data.db` | `DB_PATH` |
| `PORT` | `8000` | `PORT` |
| `SESSION_TIMEOUT_SECONDS` | `3600` | `SESSION_TIMEOUT_SECONDS` |

LiteLLM bridges ADK's `LlmAgent` to Anthropic. The `config.py` `model_validator` exports `ANTHROPIC_API_KEY` to `os.environ` at startup so LiteLLM picks it up without additional configuration.

## Feature milestones

| # | Protocol | Feature | Status |
|---|----------|---------|--------|
| F1 | AG-UI | Chat + streaming + agent suggestions | Done |
| F2 | AG-UI | Generative UI — agent builds `VizPayload[]` from data | Done |
| F3 | AG-UI | Human-in-the-loop store / period selection | Planned |
| F4 | MCP | Live QSR industry benchmarks via web MCP (replaces `get_industry_context` static data) | Planned |
| F5 | A2A | `AnalystAgent` promoted to standalone A2A service | Planned |

## Further reading

- [protocols.md](./protocols.md) — AG-UI, MCP, A2A sequence diagrams
- [AGENTS.md](../AGENTS.md) — agent tools, state contract, VizPayload union, extension points
- [backend-agents.md](./backend-agents.md) — ADK hierarchy, tools, session state, LiteLLM bridge
- [adk-copilotkit-primer.md](./adk-copilotkit-primer.md) — how ADK and CopilotKit wire together
