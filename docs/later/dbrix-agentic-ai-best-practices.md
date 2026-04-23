# Agentic AI App Best Practices

> Framework-agnostic principles for building production-quality AI agents.
> Source: Synthesized from Databricks "Big Book of GenAI" + Agent Bricks capability map.
> Applies to: any multi-agent app regardless of stack, domain, or scale.

---

## The Core Truth

**The gap between a demo and a production agent is not a model problem. It's a data quality, evaluation discipline, and governance problem.**

Models are good enough. What fails in production:
- Retrieval returning irrelevant or malformed content
- No feedback loop to know when the agent is wrong
- No observability into which sub-step failed
- Agents acting with excessive permissions
- Quality assessed by vibes, not metrics

---

## 1. Architecture Principles

### 1.1 The Agent Capability Stack

Every agent is built from four primitives:

| Layer | What it is | Examples |
|---|---|---|
| **Perception** | What the agent can read | Text, images, audio, structured data, tool results |
| **Memory** | How the agent retains knowledge | In-context (short-lived), external (vector DB), semantic (meaning-indexed), procedural (system prompts) |
| **Action** | What the agent can do | Storage R/W, process execution, UI manipulation, API calls, spawning sub-agents |
| **Reasoning** | How the agent decides | Chain-of-thought, tool selection, delegation, self-critique |

### 1.2 Decision Tree: When to Use What

```
Simple question → single LLM call (no agent needed)
  ↓ needs knowledge retrieval
RAG (retrieval-augmented generation)
  ↓ needs to take actions or use tools
Tool-calling agent
  ↓ tasks are too complex or long for one context window
Multi-agent system
  ↓ sub-tasks need independent quality guarantees
Evaluator-optimizer pattern
```

Never start with multi-agent. Escalate when simpler patterns break down.

### 1.3 Multi-Agent Patterns

| Pattern | When to use | Key property |
|---|---|---|
| **Sequential** | Steps depend on prior output | Deterministic pipeline, easy to trace |
| **Parallel** | Tasks are independent | Speed; combine results at fan-in |
| **Router** | Different inputs need different specialists | Intent classification → dispatch |
| **Orchestrator-Worker** | Complex tasks require coordination | Orchestrator plans; workers execute |
| **Evaluator-Optimizer** | Output quality must be verified | Generator → Evaluator → retry if below threshold |

### 1.4 Tool Architecture

- **MCP (Model Context Protocol)** is the standard for connecting agents to tools. Treat tools as first-class governed resources, not ad-hoc integrations.
- **Least-privilege always**: an agent should access only the data its current task requires — never broader.
- **OBO (On-Behalf-Of) auth**: when an agent acts for a user, it should carry that user's credentials, not a generic service account with elevated permissions.
- One agent's tool should not silently become another agent's capability without explicit delegation.

---

## 2. Data & Retrieval Principles

### 2.1 Data Quality Dominates Model Choice

Upgrading your model is often the last thing to try. Fix data first:

1. **Parsing** — the highest-leverage step. Lossy parsing (e.g., naive PDF text extraction) corrupts every downstream step. Use multimodal parsers or purpose-built extractors for complex formats. Garbage in, garbage out no matter what model you use.

2. **Chunking** — semantic chunking (split at meaning boundaries) outperforms fixed-size chunking. Fixed-size splits break mid-sentence, mid-table, mid-argument.

3. **Embedding** — model choice matters less than chunk quality. A good chunk with a mediocre embedder beats a bad chunk with the best embedder.

4. **Indexing** — hybrid search (vector similarity + BM25 keyword) via Reciprocal Rank Fusion (RRF) outperforms either alone. Vector search misses exact keyword matches; BM25 misses semantic equivalents. RRF combines rankings without needing score normalization.

### 2.2 The Data Flywheel

```
Production traffic → traces → curated eval datasets → better retrieval tuning → better answers → more production traffic
```

This loop is the compounding advantage. Systems that capture and use production feedback improve continuously. Systems that don't stagnate.

### 2.3 Query Construction Discipline

Retrieval quality is directly tied to query quality. The agent's query to a retrieval system should be explicit and rich — include: task type, key entities, constraints, context. Never pass raw user input directly to a retriever without reformulation.

---

## 3. Evaluation Principles

### 3.1 Measure Before You Optimize

You cannot improve what you don't measure. Define quality metrics before writing agent code, not after. Common dimensions:

- **Correctness**: is the answer factually right?
- **Completeness**: does it address the full question?
- **Relevance**: is it on topic for the user's actual intent?
- **Safety**: does it avoid harmful, toxic, or policy-violating content?
- **Adherence**: does it follow domain-specific rules?

### 3.2 The Three Optimization Levers (in order of ROI)

1. **Prompt optimization** — cheapest, highest return. TAO (Test-time Adaptive Optimization) and structured prompt engineering routinely match fine-tuning performance at a fraction of the cost.
2. **Better retrieval** — improve parsing, chunking, hybrid search before touching the model.
3. **Model upgrade or fine-tuning** — last resort. Adds cost and complexity; only justified when levers 1 and 2 are exhausted.

### 3.3 LLM Judges

Use LLMs to evaluate LLM outputs at scale:

- **Built-in scorers**: correctness, relevance, safety — auto-evaluate production traffic
- **Custom judges**: codify domain-specific rules as judge prompts ("Did the agent cite a source?", "Is every ingredient included?")
- **Judge calibration**: judges must be aligned with human expert consensus on a small labeled set — otherwise they measure the wrong thing confidently
- **Judge portfolio**: decompose quality into multiple narrow judges rather than one broad "is this good?" judge. Narrow judges are more reliable and interpretable.

### 3.4 The Continuous Improvement Cycle (9-step)

```
1. Production app generates traces
2. End users provide feedback (thumbs up/down, corrections)
3. Automated scorers run on all traces
4. Trace UI surfaces low-scoring patterns
5. Domain experts label a sample (optional but high-value)
6. Curate evaluation datasets from problematic + high-quality traces
7. Tune judges to align with expert labels
8. Run eval harness: test new versions against eval datasets using same scorers
9. Deploy or iterate
```

This cycle should be instrumented from day one, even if steps 5-7 aren't run yet.

### 3.5 ALHF (Agent Learning from Human Feedback)

Expert natural-language feedback (e.g., "always use metric units", "prefer recipes under 30 minutes") is more powerful than numeric scores. With as few as 32 expert feedback examples, adherence scores can jump from ~10% to ~80%. The mechanism:

- Expert provides specific, natural-language rules
- System scopes each rule (which future queries it applies to)
- Routes rule to the correct component for adaptation

The takeaway: high-signal, low-volume expert feedback compounds. Collect it from day one.

---

## 4. Quality Improvement Techniques

### 4.1 Best-of-N

Generate N candidate responses, evaluate all N with a judge, return the best. Increases quality at the cost of latency and tokens. Use when quality matters more than speed, or when the task has verifiable correct answers.

### 4.2 Critique Filtering

After generating a response, run a self-critique pass: "What's wrong with this answer?" Use the critique to filter or regenerate. Cheap version of the evaluator-optimizer pattern without a separate agent.

### 4.3 Constitutional AI

Define a set of principles (a "constitution") the agent must adhere to. At generation time, the agent checks its own output against the constitution and revises. Useful for safety, policy adherence, and consistent tone.

### 4.4 Contextual Retrieval

Instead of retrieving document chunks directly, prepend each chunk with a brief summary of what the source document says. Dramatically improves retrieval precision for chunks that are ambiguous out of context (e.g., a table without its header).

### 4.5 o1-Style Reasoning

For tasks requiring multi-step deduction, let the model "think before answering" — produce a scratchpad of reasoning steps before committing to the final response. Not needed for simple tasks; high-value for planning, math, logical inference. Budget-aware: use only when the task complexity justifies the extra tokens.

### 4.6 Value-Guided Decoding

At generation time, use a value model (reward model or critic) to steer token selection toward higher-quality outputs. More powerful than post-hoc filtering — improves quality without generating wasted completions. Requires a trained value model.

### 4.7 Synthetic Data Generation

When labeled data is scarce:
- Generate synthetic Q&A pairs from your knowledge base using an LLM
- Have domain experts review a sample for correctness
- Use synthetic data to bootstrap eval datasets, judges, and fine-tuning

32 high-quality synthetic examples aligned with expert review can be enough to meaningfully shift quality (see ALHF above).

### 4.8 RLHF / RLVR

- **RLHF** (Reinforcement Learning from Human Feedback): fine-tune a model using human preference rankings. High quality, high cost, requires significant labeled data.
- **RLVR** (Reinforcement Learning with Verifiable Rewards): use rule-based or verifiable reward signals (e.g., "did the code pass the test?", "is the math correct?") instead of human preferences. Cheaper, scalable, high-signal when correctness is verifiable.

For most production applications: start with ALHF (natural language expert feedback) before considering RLHF.

---

## 5. Observability Principles

### 5.1 Trace Everything from Day One

Every agent execution should produce a trace: input, intermediate steps (tool calls, retrievals, sub-agent calls), and output. Without this, debugging is guesswork.

A trace must capture:
- The original user input
- Each tool call: name, arguments, result
- Each retrieval: query, top-k chunks returned
- Each sub-agent call: instruction, response
- Final output
- Latency and token count per step

### 5.2 Correlate Across Sub-Agents

In multi-agent systems, each sub-agent logs independently. Without a shared request/trace ID, you cannot reconstruct what happened during a single user interaction. Add a `trace_id` or `run_id` to every log line and propagate it through all sub-agent calls.

### 5.3 Production Parity

Use the same instrumentation in development and production. If you only trace in dev, you'll miss production failures. If you only trace in prod, local debugging is slow. Same code path, same trace format, both environments.

### 5.4 Cost and Latency Per Step

Track costs and latency at the individual component level, not just end-to-end. A 10-second response where 9 seconds is one tool call is a different problem than a 10-second response spread across 5 sub-agents. Granular measurement enables targeted optimization.

---

## 6. Governance Principles

### 6.1 Least Privilege for Agents

An agent should never have broader access than its current task requires. Avoid generic service accounts with elevated permissions — agents should act with the user's identity and permissions (OBO pattern).

### 6.2 Treat AI Assets as First-Class Governed Resources

Models, prompts, tools, and functions deserve the same governance as data: versioning, access control, lineage, and audit trails. "Who changed this prompt, when, and why?" should be answerable.

### 6.3 MCP Tool Governance

MCP enables tool sprawl. Govern MCP tools like a catalog:
- Approved tools are discoverable and permission-gated
- External vendor tools require explicit trust grants
- Audit which agent used which tool and when

### 6.4 AI Gateway Pattern

All model traffic should route through a centralized gateway that enforces:
- **Rate limiting**: cap usage per user/endpoint to prevent runaway costs
- **Fallbacks**: if provider A returns 429 or errors, auto-reroute to provider B
- **PII detection**: scan inputs and outputs for sensitive data before it leaves the system
- **Guardrails**: filter harmful or policy-violating content in real time
- **A/B traffic splitting**: route a percentage of traffic to a new model version to validate quality before full cutover

### 6.5 Unified Inference Interface

Abstract your model access behind a single interface. This enables:
- Swapping models (Claude → Gemini → Llama) without application code changes
- Comparing models on the same workload
- Preventing vendor lock-in

### 6.6 Feedback Persistence is Non-Negotiable

Thumbs up/down, explicit corrections, and implicit signals (did the user immediately re-ask?) are the raw material of continuous improvement. If these signals are console-logged and discarded, you have no data flywheel. Persist them from day one even if you don't process them yet.

---

## 7. Agent Design Anti-Patterns

| Anti-pattern | What goes wrong | Fix |
|---|---|---|
| **Start with the model** | You optimize the wrong thing | Fix data and prompts first |
| **Single giant agent** | Undebuggable, hard to evaluate, context blowout | Decompose into focused sub-agents |
| **No eval before shipping** | No baseline, no regression detection | Define metrics and eval dataset before v1 |
| **Broad service account** | Security risk; agent can access more than it should | OBO auth; least-privilege per task |
| **Raw user input to retriever** | Noisy retrieval, bad answers | Reformulate queries before retrieval |
| **Fixed-size chunking** | Splits mid-sentence, mid-table | Semantic chunking |
| **Discarded user feedback** | No data flywheel, stagnant quality | Persist all feedback signals |
| **Trace ID not propagated** | Cannot reconstruct multi-agent execution | Add `trace_id` to all log lines |
| **One broad quality judge** | Low reliability, opaque failure modes | Multiple narrow judges per quality dimension |
| **HITL as afterthought** | Users lose trust when errors surface | Design HITL checkpoints into the agent workflow from the start |

---

## 8. The Production Readiness Checklist

Before calling an agent "production-ready":

- [ ] Eval dataset exists with labeled examples
- [ ] Automated scorers run on every deployment candidate
- [ ] Traces captured for all production traffic
- [ ] Feedback signals (explicit + implicit) persisted
- [ ] Agents run with least-privilege credentials
- [ ] Cost and latency tracked per sub-step
- [ ] Fallback path exists if primary model provider fails
- [ ] Judge prompts validated against human expert consensus
- [ ] All tools are governed (discoverable, permission-gated, audited)
- [ ] Model can be swapped without changing application code

---

## Capability Reference (Agent Bricks Map)

Quick reference for when each technique applies:

| Capability | Use when |
|---|---|
| **Prompt optimization / TAO** | Quality is below target; try before any other fix |
| **Best-of-N** | High-stakes outputs where latency is acceptable |
| **Critique filtering** | Self-consistency matters; cheap quality floor |
| **Constitutional AI** | Safety or policy adherence is a hard requirement |
| **Fine-tuning** | Domain-specific style/format not achievable with prompting |
| **Synthetic data generation** | Eval dataset too small; bootstrapping judges |
| **RLHF** | Have significant human preference data; long-term investment |
| **RLVR** | Correctness is verifiable (code, math, structured output) |
| **ALHF** | Small number of expert users; natural language feedback available |
| **Adaptive LLM judges** | Automated quality scoring at scale; judge calibration needed |
| **Contextual retrieval** | RAG answer quality poor; chunks ambiguous out of context |
| **Hybrid search (RRF)** | Retrieval misses obvious keyword matches or semantic equivalents |
| **o1-style reasoning** | Multi-step planning, math, logical inference |
| **Value-guided decoding** | Want quality improvement without Best-of-N token waste |
| **Deep research agents** | Tasks require iterative search, synthesis across many sources |
| **Agentic knowledge graphs** | Structured relationships matter; pure vector search insufficient |
| **Multi-agentic patterns** | Task too complex for one agent; need independent quality guarantees |
| **MixAttention** | Efficiency optimization for long contexts; architectural concern |
