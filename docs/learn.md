# Learning Notes — Next.js + CopilotKit Concepts

---

## Next.js: layout.tsx vs page.tsx

- `layout.tsx` — persistent shell; wraps all pages under its route; **never remounts** on navigation
- `page.tsx` — the content for a specific URL; swapped per route
- Rule: providers, auth guards, nav bars → `layout.tsx`. Visible page content → `page.tsx`
- `CopilotKit` provider lives in `layout.tsx` so the agent session persists across navigation

---

## File-based Routing

- The folder path under `app/` **is** the URL. No router config needed.
- `app/page.tsx` → `/`
- `app/nutrition/page.tsx` → `/nutrition`
- `app/recipes/page.tsx` → `/recipes`
- A file named `route.ts` (not `page.tsx`) makes a folder an **API endpoint**, not a rendered page
- `app/api/` is convention only — the `route.ts` file is what Next.js actually keys on
- `public/` is a truly reserved folder at project root — files served as static assets at `/`

---

## CopilotKit: Session Context

- `CopilotKit` provider is a React context — session state lives in **browser memory**
- Holds: runtime URL, active agent name, message history, AG-UI state snapshots, registered actions
- Hard refresh destroys it — no persistence to localStorage or server
- The Python ADK backend has its own session state; AG-UI events keep the two in sync while connected

---

## CopilotKit: How All Components Funnel Through One Runtime

- One `CopilotKit` provider → one `/api/copilotkit` endpoint → one `CopilotRuntime`
- Every CK component on every page (CopilotChat, useCopilotAction, useCopilotReadable) calls into the same provider via `useContext`
- The runtime dispatches per request type:
  - Agent messages → `HttpAgent` → your backend
  - Suggestions / peripheral ops → `AnthropicAdapter` → local, never hits your backend
  - `useCopilotReadable` → updates context only, no HTTP

---

## Multiple HttpAgents / Multiple Backends

- Register multiple agents in `route.ts`:
  ```ts
  agents: [
    new HttpAgent({ name: "recipe_scout", url: "http://localhost:8000/agent" }),
    new HttpAgent({ name: "nutrition_coach", url: "http://localhost:8001/agent" }),
  ]
  ```
- Runtime does a name lookup on every incoming POST — no magic, just a registry
- Agent selection precedence: **component-level `agent` prop** overrides **provider-level default**
- Practical pattern: set a sensible default on the provider, override explicitly per page where needed
- Why multiple backends: separation of concerns, independent scaling, independent deployment, focused agents per domain

---

## `app/api/` vs `public/`

| | `app/api/` | `public/` |
|---|---|---|
| Location | inside `app/` | project root |
| Reserved by Next.js? | no — convention only | yes |
| What makes it special | `route.ts` file inside | Next.js owns static serving |
| Example | `POST /api/copilotkit` | `GET /logo.png` |

---

## CopilotKit v2: CopilotChat Customization

### Dev tool props on `<CopilotKit>` provider (`layout.tsx`)

Two separate props — both needed to fully clean up the dev UI:
- `showDevConsole={false}` — hides the "now live" toast banner
- `enableInspector={false}` — hides the floating inspector button

### CSS theming (`globals.css`)

**Font override:** CopilotKit's font is controlled by a CSS variable, not a class. Override it on `.copilotKitChat`:
```css
.copilotKitChat {
  --cpk-default-font-family: var(--font-geist-sans), system-ui, sans-serif;
}
```
Setting `font-family` directly on `.copilotKitAssistantMessage p` loses to CopilotKit's internal rules.

**CSS specificity:** CopilotKit uses single-class selectors via `cpk:prose`. To override spacing/line-height you need two-class selectors:
```css
/* wins */
.copilotKitChat .copilotKitAssistantMessage p { line-height: 1.5; }

/* ties and loses */
.copilotKitAssistantMessage p { line-height: 1.5; }
```

### Slot system (`CopilotChat` props)

Slots (`input`, `welcomeScreen`, `messageView`, etc.) accept three forms:

| Value type | Behavior |
|---|---|
| `string` | Treated as className, merged via twMerge onto the default element |
| `React component` | Replaces the default component entirely |
| `plain object` | Props spread into the default component |

Example — taller textarea via className slot:
```tsx
<CopilotChat input={{ textArea: "min-h-[4.5rem]" }} />
```

### `welcomeScreen` render-prop

Pass a `children` function via the slot object. CopilotKit calls it with `{ welcomeMessage, input, suggestionView }`:
```tsx
<CopilotChat
  welcomeScreen={{ children: ({ welcomeMessage, input }) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {welcomeMessage}
      </div>
      <div>{input}</div>
    </div>
  )}}
/>
```
This is the only way to control the welcome screen layout (e.g. pin input to bottom while centering the welcome text).

### `useAgent` — correct usage

`useAgent()` with no args defaults to agent name `'default'`. If only `recipe_scout` is registered this throws at runtime. Always pass the explicit agentId:
```tsx
const { agent } = useAgent({ agentId: "recipe_scout" });
```
`agent.messages` is `undefined` on first render — always guard:
```tsx
const hasMessages = (agent.messages?.length ?? 0) > 0;
```

### Props that do NOT exist in v2

| What you might try | What to use instead |
|---|---|
| `inputProps={{ maxRows: 5 }}` | No equivalent — `maxRows` doesn't exist |
| `inputProps={{ ... }}` | `input` slot: `input={{ textArea: "className" }}` |
| `suggestions="auto"` | Built-in, no prop needed |
