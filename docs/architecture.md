# Recipe Scout — System Architecture

AI-powered recipe discovery assistant. The user chats via a CopilotKit frontend; an ADK multi-agent backend does the work; all three are wired together with the AG-UI protocol.

## Component overview

```mermaid
flowchart TB
    subgraph B["Browser"]
        PROV["CopilotKit Provider<br/>agent: recipe_scout<br/>Path: app/layout.tsx"]
        Chat["CopilotChat<br/>suggestions: auto<br/>Path: app/page.tsx"]
        PROV --> Chat
    end

    subgraph S["Next.js server"]
        RT["CopilotRuntime<br/>Path: app/api/copilotkit/route.ts"]
        HA["HttpAgent<br/>target: localhost:8000/agent<br/>Path: app/api/copilotkit/route.ts"]
        AA["AnthropicAdapter<br/>Model: claude-haiku-4-5<br/>Path: app/api/copilotkit/route.ts"]
        RT --> HA
        RT --> AA
    end

    subgraph A["ADK backend"]
        ORC["OrchestratorAgent<br/>name: recipe_scout<br/>Model: claude-sonnet-4-6<br/>Path: agents/orchestrator.py"]
        SA1["RecipeSearchAgent<br/>Model: claude-haiku-4-5<br/>Path: agents/orchestrator.py"]
        SA2["RecipeDetailAgent<br/>Model: claude-haiku-4-5<br/>Path: agents/orchestrator.py"]
        SA3["ShoppingListAgent<br/>Model: claude-haiku-4-5<br/>Path: agents/orchestrator.py"]
        ORC --> SA1
        ORC --> SA2
        ORC --> SA3
    end

    ANT["Anthropic API"]
    TAV["Tavily API"]

    Chat -->|"HTTP POST  /api/copilotkit"| RT
    HA -->|"① agent messages<br/>AG-UI SSE stream"| ORC
    AA -->|"② suggestions / peripherals"| ANT
    ORC -->|"LiteLLM"| ANT
    SA1 -->|"Tool: search_recipes"| TAV
    SA2 -->|"Tool: fetch_recipe_detail"| TAV

    classDef browser fill:#dbeafe,stroke:#2563eb,color:#1e3a5f
    classDef server fill:#f1f5f9,stroke:#475569,color:#0f172a
    classDef backend fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef external fill:#fef9c3,stroke:#d97706,color:#78350f

    class PROV,Chat browser
    class RT,HA,AA server
    class ORC,SA1,SA2,SA3 backend
    class ANT,TAV external
```

> **Key point:** `/api/copilotkit` is a Next.js API route running server-side on
> the same host as the frontend. `CopilotRuntime` proxies all agent traffic —
> the browser never talks directly to the ADK backend.

## Request paths

There are two separate paths through the runtime:

| Path | Trigger | Adapter | Destination |
|------|---------|---------|-------------|
| Agent messages | User sends a chat message | `HttpAgent` | ADK backend `:8000/agent` via AG-UI |
| Peripheral ops | Suggestion generation, `CopilotTask` | `AnthropicAdapter` (Haiku) | Anthropic API directly |

The two paths share the same `CopilotRuntime` instance but never cross. Agent reasoning always happens in the ADK backend; CopilotKit's Haiku adapter is only used for UI-layer LLM work.

## Protocol stack

```mermaid
flowchart LR
    A["Browser<br/>CopilotChat"] -->|"HTTP POST"| B["CopilotRuntime<br/>Next.js server"]
    B -->|"AG-UI SSE stream"| C["ADK Backend<br/>:8000/agent"]
    C -->|"delegate"| D["Sub-agents"]
```

Three protocols are used across the full F1–F5 roadmap:

- **AG-UI** — streaming event bus between frontend and ADK agent (F1–F3)
- **MCP** — connect external tool servers to ADK agent as toolsets (F4)
- **A2A** — promote sub-agents to standalone network services (F5)

See [protocols.md](./protocols.md) for full sequence diagrams per protocol.

## Feature milestones

| # | Protocol | Feature | Status |
|---|----------|---------|--------|
| F1 | AG-UI | Chat + streaming + suggestions | Done |
| F2 | AG-UI | Recipe cards — Generative UI from agent state | Planned |
| F3 | AG-UI | Recipe detail + human-in-the-loop selection | Planned |
| F4 | MCP | Ingredient lookup / substitutions via MCP server | Planned |
| F5 | A2A | Shopping list sub-agent as standalone A2A service | Planned |

## Further reading

- [protocols.md](./protocols.md) — AG-UI, MCP, A2A sequence diagrams
- [copilotkit-internals.md](./copilotkit-internals.md) — CopilotRuntime, adapters, hooks, rendering pipeline
- [backend-agents.md](./backend-agents.md) — ADK hierarchy, tools, session state, LiteLLM bridge
