# AI-Driven Data Visualizations via AG-UI

Notes from session discussion. Come back to this when building a data viz feature.

---

## The Core Problem

Vega-Lite is LLM-reliable but looks raw out of the box. Raw D3 looks great but LLM generation is unreliable (too imperative, too many ways to express the same thing). The goal is **both** — polished aesthetics AND reliable agent generation.

## What Makes Charts Look Slick

The library is not the differentiator. What matters:
- Custom color palette, typography matching the app
- Animations and transitions
- Removing chartjunk (gridlines, excess borders, tick marks)
- Thoughtful whitespace and layout

A single shared theme file does the heavy lifting. The agent never touches aesthetics — it only decides data shape, chart type, and axis mappings.

## How Claude.ai Artifact Charts Work

Claude generates real React + library JSX code, not a JSON spec. The code is sandboxed and rendered. Full code = full aesthetic control. This is why those charts look polished.

Replicating this in your own app is possible but complex (sandboxed iframe renderer). Overkill unless chart customization is a core product feature.

---

## Recommended Approach: Nivo + Typed ChartSpec

### Why Nivo

- Beautiful defaults, animations built in
- React-native (no imperative D3 code)
- Global theme system — define once, all charts inherit
- LLMs generate Nivo configs reliably (well-documented, in training data)
- Covers: bar, line, scatter, heatmap, treemap, network, chord, calendar, and more

### Option Comparison

| Approach | Aesthetics | LLM Reliability | Complexity |
|---|---|---|---|
| Nivo + typed ChartSpec | Very good | High | Low |
| shadcn/ui charts (Recharts + Tailwind) | Very good | High | Low |
| Tremor | Good (dashboard-y) | Medium | Low |
| Vega-Lite + custom theme | Decent | High | Medium |
| Agent generates JSX → sandboxed render | Excellent | High | High |
| Raw D3 | Limitless | Low | High |

---

## AG-UI Integration Pattern

```
User asks a question about data
  → Agent queries dataset (SQL tool or data tool)
  → Agent generates a typed ChartSpec from the result
  → ChartSpec written to agent state
  → AG-UI STATE_SNAPSHOT streams it to the frontend
  → Frontend picks the right Nivo component based on chart_type
  → One shared Nivo theme makes it look polished
```

### ChartSpec Contract (Python)

```python
from typing import Literal
from pydantic import BaseModel

ChartType = Literal["bar", "line", "scatter", "pie", "heatmap"]

class ChartSpec(BaseModel):
    chart_type: ChartType
    title: str | None = None
    data: list[dict]          # rows — agent fills from query results
    x_key: str                # field name for x-axis
    y_key: str                # field name for y-axis
    color_key: str | None = None   # optional grouping dimension
    x_label: str | None = None
    y_label: str | None = None
```

Add to `AgentState`:
```python
class AgentState(BaseModel):
    ...
    chart: ChartSpec | None = None
```

### Frontend Render (TypeScript)

```tsx
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";

// One theme — define once to match your app
const nivoTheme = {
  fontFamily: "var(--font-geist-sans)",
  textColor: "#6b7280",
  fontSize: 11,
  axis: {
    ticks: { text: { fontSize: 11 } },
    legend: { text: { fontSize: 12, fontWeight: 600 } },
  },
  grid: { line: { stroke: "#e5e2db" } },
  tooltip: {
    container: {
      background: "#ffffff",
      border: "1px solid #e5e2db",
      borderRadius: 8,
      fontSize: 11,
    },
  },
};

function ChartRenderer({ spec }: { spec: ChartSpec }) {
  if (spec.chart_type === "bar") {
    return (
      <ResponsiveBar
        data={spec.data}
        keys={[spec.y_key]}
        indexBy={spec.x_key}
        theme={nivoTheme}
        colors={["#d63b2f"]}   // app accent
        animate
        axisBottom={{ legend: spec.x_label }}
        axisLeft={{ legend: spec.y_label }}
      />
    );
  }
  // add line, scatter, etc.
}
```

### AG-UI Wiring (via useFrontendTool or agent state)

**Option A — agent state (simpler):**
```tsx
const { agent } = useAgent({ agentId: "my_agent" });
const agentState = agent.state as AgentState | null;

{agentState?.chart && (
  <div style={{ height: 400 }}>
    <ChartRenderer spec={agentState.chart} />
  </div>
)}
```

**Option B — useFrontendTool (agent explicitly triggers render):**
```tsx
useFrontendTool({
  name: "render_chart",
  description: "Render a data visualization",
  parameters: ChartSpecSchema,
  handler: ({ spec }) => setChart(spec),
});
```

---

## Install

```bash
# Core + chart types you need
npm install @nivo/core @nivo/bar @nivo/line @nivo/scatterplot @nivo/pie

# If using heatmap, treemap, etc.
npm install @nivo/heatmap @nivo/treemap
```

---

## Key Principle

The agent owns: **data shape, chart type, axis mappings, title.**
The frontend owns: **all aesthetics — theme, colors, fonts, animations.**

This separation means the agent prompt stays simple and the visual quality is fully under your control.
