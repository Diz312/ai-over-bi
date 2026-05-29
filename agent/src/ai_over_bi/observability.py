"""
Observability — span collection, SSE event streaming, cost calculation.

Architecture:
  - ObservabilityCollector: module-level singleton, holds per-session state
  - Span: atomic unit of work (agent entry/exit, LLM call, tool call)
  - TurnTrace: ordered collection of spans for one user turn
  - context vars: propagate session_id / agent_name through ADK callback chain
  - PRICING: cost per million tokens per model
  - STATIC_PROMPT_TOKENS: pre-computed token estimates for each prompt component

SSE event types emitted to /observe/stream/{session_id}:
  span_start        → a span has begun (agent/llm/tool)
  span_end          → a span has completed with full metrics
  agui_event        → forwarded AG-UI protocol event (from route.ts)
  turn_start        → new turn started
  turn_complete     → full turn finished, includes aggregated metrics
"""

import asyncio
import json
import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Context vars — propagate session/agent identity into ADK callback chain
# ---------------------------------------------------------------------------

current_session_id: ContextVar[str] = ContextVar("current_session_id", default="")
current_agent_name: ContextVar[str] = ContextVar("current_agent_name", default="")
current_invocation_id: ContextVar[str] = ContextVar("current_invocation_id", default="")

# ---------------------------------------------------------------------------
# Pricing (USD per million tokens)
# ---------------------------------------------------------------------------

PRICING: dict[str, dict[str, float]] = {
    "claude-sonnet-4-6": {
        "input_per_mtok": 3.00,
        "output_per_mtok": 15.00,
        "thinking_per_mtok": 15.00,
    },
    "claude-haiku-4-5-20251001": {
        "input_per_mtok": 0.80,
        "output_per_mtok": 4.00,
        "thinking_per_mtok": 0.00,
    },
    "claude-3.5-haiku": {
        "input_per_mtok": 0.80,
        "output_per_mtok": 4.00,
        "thinking_per_mtok": 0.00,
    },
}

MODEL_CONTEXT_LIMITS: dict[str, int] = {
    "claude-sonnet-4-6": 200_000,
    "claude-haiku-4-5-20251001": 200_000,
    "claude-3.5-haiku": 200_000,
}

_DEFAULT_CONTEXT_LIMIT = 200_000


def compute_cost(
    model: str,
    tokens_in: int,
    tokens_out: int,
    tokens_cached: int = 0,
    tokens_thinking: int = 0,
) -> float:
    """Compute USD cost for a single LLM call."""
    p = PRICING.get(model, PRICING.get("claude-sonnet-4-6", {}))
    if not p:
        return 0.0
    # Cached tokens cost ~10% of input; approximate by reducing input count
    effective_input = max(0, tokens_in - tokens_cached) + tokens_cached * 0.1
    cost = (
        effective_input * p.get("input_per_mtok", 3.0) / 1_000_000
        + tokens_out * p.get("output_per_mtok", 15.0) / 1_000_000
        + tokens_thinking * p.get("thinking_per_mtok", 0.0) / 1_000_000
    )
    return round(cost, 8)


# ---------------------------------------------------------------------------
# Static prompt token estimates (computed once at import time)
# ---------------------------------------------------------------------------

_PROMPTS_DIR = Path(__file__).parent / "agents" / "prompts"


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token (English prose)."""
    return max(1, len(text.encode("utf-8")) // 4)


def _load_static_tokens() -> dict[str, int]:
    """Pre-compute token estimates for each prompt component."""
    result: dict[str, int] = {}
    for name in ["orchestrator.md", "data_query.md", "analyst.md", "_metric_display_rules.md"]:
        path = _PROMPTS_DIR / name
        if path.exists():
            result[name] = _estimate_tokens(path.read_text())
        else:
            result[name] = 0
    # viz_catalog — lazy-loaded to avoid circular imports
    result["viz_catalog"] = 0  # updated after catalog is available
    return result


STATIC_PROMPT_TOKENS: dict[str, int] = _load_static_tokens()


def update_viz_catalog_tokens(catalog_text: str) -> None:
    """Call once at startup after catalog is loaded."""
    STATIC_PROMPT_TOKENS["viz_catalog"] = _estimate_tokens(catalog_text)


# ---------------------------------------------------------------------------
# Span — atomic unit of observed work
# ---------------------------------------------------------------------------

@dataclass
class Span:
    span_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "llm"           # "agent" | "llm" | "tool"
    agent_name: str = ""
    model: Optional[str] = None
    started_at: float = field(default_factory=time.time)
    ended_at: Optional[float] = None

    # LLM metrics
    tokens_in: int = 0
    tokens_out: int = 0
    tokens_cached: int = 0
    tokens_thinking: int = 0
    assembled_prompt: Optional[str] = None   # full LlmRequest contents as text
    thinking_text: Optional[str] = None      # extracted thinking content

    # Tool metrics
    tool_name: Optional[str] = None
    tool_args: Optional[dict[str, Any]] = None
    tool_result: Optional[Any] = None

    # Error
    error: Optional[str] = None

    # Computed
    cost_usd: float = 0.0

    @property
    def elapsed_ms(self) -> Optional[int]:
        if self.ended_at is not None:
            return int((self.ended_at - self.started_at) * 1000)
        return None

    @property
    def context_utilization_pct(self) -> Optional[float]:
        """Percentage of model context window consumed (input tokens)."""
        if not self.model or self.tokens_in == 0:
            return None
        limit = MODEL_CONTEXT_LIMITS.get(self.model, _DEFAULT_CONTEXT_LIMIT)
        return round(self.tokens_in / limit * 100, 1)

    def to_dict(self) -> dict[str, Any]:
        return {
            "span_id": self.span_id,
            "type": self.type,
            "agent_name": self.agent_name,
            "model": self.model,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "elapsed_ms": self.elapsed_ms,
            "tokens_in": self.tokens_in,
            "tokens_out": self.tokens_out,
            "tokens_cached": self.tokens_cached,
            "tokens_thinking": self.tokens_thinking,
            "assembled_prompt": self.assembled_prompt,
            "thinking_text": self.thinking_text,
            "tool_name": self.tool_name,
            "tool_args": self.tool_args,
            "tool_result": self.tool_result,
            "error": self.error,
            "cost_usd": self.cost_usd,
            "context_utilization_pct": self.context_utilization_pct,
        }


# ---------------------------------------------------------------------------
# TurnTrace — full record for one user turn
# ---------------------------------------------------------------------------

@dataclass
class TurnTrace:
    turn_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = ""
    question: str = ""
    started_at: float = field(default_factory=time.time)
    ended_at: Optional[float] = None
    ttft_ms: Optional[int] = None       # time-to-first-token
    spans: list[Span] = field(default_factory=list)
    agui_events: list[dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None

    @property
    def elapsed_ms(self) -> Optional[int]:
        if self.ended_at is not None:
            return int((self.ended_at - self.started_at) * 1000)
        return None

    @property
    def total_cost(self) -> float:
        return round(sum(s.cost_usd for s in self.spans), 8)

    @property
    def total_tokens_in(self) -> int:
        return sum(s.tokens_in for s in self.spans if s.type == "llm")

    @property
    def total_tokens_out(self) -> int:
        return sum(s.tokens_out for s in self.spans if s.type == "llm")

    @property
    def total_tokens_cached(self) -> int:
        return sum(s.tokens_cached for s in self.spans if s.type == "llm")

    @property
    def cache_savings_usd(self) -> float:
        """Approximate savings from cached tokens (avoided full input cost)."""
        total_saved = 0.0
        for s in self.spans:
            if s.type != "llm" or not s.model or s.tokens_cached == 0:
                continue
            p = PRICING.get(s.model, PRICING.get("claude-sonnet-4-6", {}))
            saved = s.tokens_cached * p.get("input_per_mtok", 3.0) / 1_000_000 * 0.9
            total_saved += saved
        return round(total_saved, 8)

    @property
    def agents_invoked(self) -> list[str]:
        seen: list[str] = []
        for s in self.spans:
            if s.type == "agent" and s.agent_name not in seen:
                seen.append(s.agent_name)
        return seen

    @property
    def llm_spans(self) -> list[Span]:
        return [s for s in self.spans if s.type == "llm"]

    @property
    def tool_spans(self) -> list[Span]:
        return [s for s in self.spans if s.type == "tool"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "turn_id": self.turn_id,
            "session_id": self.session_id,
            "question": self.question,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "elapsed_ms": self.elapsed_ms,
            "ttft_ms": self.ttft_ms,
            "spans": [s.to_dict() for s in self.spans],
            "agui_events": self.agui_events,
            "error": self.error,
            "total_cost": self.total_cost,
            "total_tokens_in": self.total_tokens_in,
            "total_tokens_out": self.total_tokens_out,
            "total_tokens_cached": self.total_tokens_cached,
            "cache_savings_usd": self.cache_savings_usd,
            "agents_invoked": self.agents_invoked,
        }

    def to_summary_dict(self) -> dict[str, Any]:
        """Lightweight summary for the turn history list."""
        return {
            "turn_id": self.turn_id,
            "session_id": self.session_id,
            "question": self.question,
            "started_at": self.started_at,
            "elapsed_ms": self.elapsed_ms,
            "ttft_ms": self.ttft_ms,
            "total_cost": self.total_cost,
            "total_tokens_in": self.total_tokens_in,
            "total_tokens_out": self.total_tokens_out,
            "total_tokens_cached": self.total_tokens_cached,
            "cache_savings_usd": self.cache_savings_usd,
            "agents_invoked": self.agents_invoked,
            "error": self.error,
        }


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

@dataclass
class _SessionState:
    current_turn: Optional[TurnTrace] = None
    completed_turns: list[TurnTrace] = field(default_factory=list)
    # In-flight agent-level span (one per active agent call)
    agent_spans: dict[str, Span] = field(default_factory=dict)
    # In-flight LLM spans keyed by invocation_id
    llm_spans: dict[str, Span] = field(default_factory=dict)
    # In-flight tool spans keyed by tool_name+timestamp
    tool_spans: dict[str, Span] = field(default_factory=dict)
    # SSE subscribers
    queues: list[asyncio.Queue[Optional[dict[str, Any]]]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# ObservabilityCollector — module-level singleton
# ---------------------------------------------------------------------------

class ObservabilityCollector:
    """Central hub for all observability data collection and SSE distribution."""

    def __init__(self) -> None:
        self._sessions: dict[str, _SessionState] = {}

    def _get_session(self, session_id: str) -> _SessionState:
        if session_id not in self._sessions:
            self._sessions[session_id] = _SessionState()
        return self._sessions[session_id]

    # ------------------------------------------------------------------
    # Turn lifecycle
    # ------------------------------------------------------------------

    def start_turn(self, session_id: str, question: str) -> TurnTrace:
        state = self._get_session(session_id)
        turn = TurnTrace(session_id=session_id, question=question)
        state.current_turn = turn
        self._push(session_id, {"type": "turn_start", "turn": turn.to_summary_dict()})
        return turn

    def end_turn(self, session_id: str, error: Optional[str] = None) -> Optional[TurnTrace]:
        state = self._get_session(session_id)
        turn = state.current_turn
        if turn is None:
            return None
        turn.ended_at = time.time()
        if error:
            turn.error = error
        state.completed_turns.append(turn)
        state.current_turn = None
        self._push(session_id, {"type": "turn_complete", "turn": turn.to_dict()})
        return turn

    def record_ttft(self, session_id: str) -> None:
        state = self._get_session(session_id)
        if state.current_turn and state.current_turn.ttft_ms is None:
            state.current_turn.ttft_ms = int(
                (time.time() - state.current_turn.started_at) * 1000
            )

    # ------------------------------------------------------------------
    # Agent spans
    # ------------------------------------------------------------------

    def agent_start(self, session_id: str, agent_name: str, invocation_id: str) -> Span:
        state = self._get_session(session_id)
        span = Span(type="agent", agent_name=agent_name)
        state.agent_spans[invocation_id] = span
        if state.current_turn:
            state.current_turn.spans.append(span)
        self._push(session_id, {"type": "span_start", "span": span.to_dict()})
        return span

    def agent_end(
        self, session_id: str, invocation_id: str, error: Optional[str] = None
    ) -> Optional[Span]:
        state = self._get_session(session_id)
        span = state.agent_spans.pop(invocation_id, None)
        if span is None:
            return None
        span.ended_at = time.time()
        if error:
            span.error = error
            if state.current_turn:
                state.current_turn.error = error
        self._push(session_id, {"type": "span_end", "span": span.to_dict()})
        return span

    # ------------------------------------------------------------------
    # LLM spans
    # ------------------------------------------------------------------

    def llm_start(
        self,
        session_id: str,
        agent_name: str,
        invocation_id: str,
        model: Optional[str],
        assembled_prompt: Optional[str] = None,
    ) -> Span:
        state = self._get_session(session_id)
        span = Span(
            type="llm",
            agent_name=agent_name,
            model=model,
            assembled_prompt=assembled_prompt,
        )
        state.llm_spans[invocation_id] = span
        if state.current_turn:
            state.current_turn.spans.append(span)
        self._push(session_id, {"type": "span_start", "span": span.to_dict()})
        return span

    def llm_end(
        self,
        session_id: str,
        invocation_id: str,
        tokens_in: int = 0,
        tokens_out: int = 0,
        tokens_cached: int = 0,
        tokens_thinking: int = 0,
        thinking_text: Optional[str] = None,
        error: Optional[str] = None,
    ) -> Optional[Span]:
        state = self._get_session(session_id)
        span = state.llm_spans.pop(invocation_id, None)
        if span is None:
            return None
        span.ended_at = time.time()
        span.tokens_in = tokens_in
        span.tokens_out = tokens_out
        span.tokens_cached = tokens_cached
        span.tokens_thinking = tokens_thinking
        span.thinking_text = thinking_text
        if error:
            span.error = error
        if span.model:
            span.cost_usd = compute_cost(
                span.model, tokens_in, tokens_out, tokens_cached, tokens_thinking
            )
        self._push(session_id, {"type": "span_end", "span": span.to_dict()})
        return span

    # ------------------------------------------------------------------
    # Tool spans
    # ------------------------------------------------------------------

    def tool_start(
        self,
        session_id: str,
        agent_name: str,
        tool_name: str,
        tool_args: Optional[dict[str, Any]] = None,
    ) -> Span:
        state = self._get_session(session_id)
        span = Span(
            type="tool",
            agent_name=agent_name,
            tool_name=tool_name,
            tool_args=tool_args,
        )
        key = f"{tool_name}_{span.started_at}"
        state.tool_spans[key] = span
        if state.current_turn:
            state.current_turn.spans.append(span)
        self._push(session_id, {"type": "span_start", "span": span.to_dict()})
        return span, key

    def tool_end(
        self,
        session_id: str,
        key: str,
        tool_result: Optional[Any] = None,
        error: Optional[str] = None,
    ) -> Optional[Span]:
        state = self._get_session(session_id)
        span = state.tool_spans.pop(key, None)
        if span is None:
            return None
        span.ended_at = time.time()
        span.tool_result = tool_result
        if error:
            span.error = error
        self._push(session_id, {"type": "span_end", "span": span.to_dict()})
        return span

    # ------------------------------------------------------------------
    # AG-UI event recording
    # ------------------------------------------------------------------

    def record_agui_event(self, session_id: str, event: dict[str, Any]) -> None:
        state = self._get_session(session_id)
        if state.current_turn:
            state.current_turn.agui_events.append(event)
        # Check for first text token (TTFT)
        if event.get("type") == "TEXT_MESSAGE_CONTENT":
            self.record_ttft(session_id)
        self._push(session_id, {"type": "agui_event", "event": event})

    # ------------------------------------------------------------------
    # SSE subscription
    # ------------------------------------------------------------------

    def subscribe(self, session_id: str) -> asyncio.Queue[Optional[dict[str, Any]]]:
        state = self._get_session(session_id)
        q: asyncio.Queue[Optional[dict[str, Any]]] = asyncio.Queue()
        state.queues.append(q)
        return q

    def unsubscribe(
        self, session_id: str, q: asyncio.Queue[Optional[dict[str, Any]]]
    ) -> None:
        state = self._get_session(session_id)
        try:
            state.queues.remove(q)
        except ValueError:
            pass

    def _push(self, session_id: str, event: dict[str, Any]) -> None:
        state = self._sessions.get(session_id)
        if not state:
            return
        for q in list(state.queues):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # drop if subscriber is too slow

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def get_turns(self, session_id: str) -> list[dict[str, Any]]:
        state = self._get_session(session_id)
        return [t.to_summary_dict() for t in state.completed_turns]

    def get_turn_detail(self, session_id: str, turn_id: str) -> Optional[dict[str, Any]]:
        state = self._get_session(session_id)
        for t in state.completed_turns:
            if t.turn_id == turn_id:
                return t.to_dict()
        return None

    def get_session_totals(self, session_id: str) -> dict[str, Any]:
        state = self._get_session(session_id)
        turns = state.completed_turns
        total_cost = sum(t.total_cost for t in turns)
        total_tokens_in = sum(t.total_tokens_in for t in turns)
        total_tokens_out = sum(t.total_tokens_out for t in turns)
        total_cache_savings = sum(t.cache_savings_usd for t in turns)
        avg_cost = total_cost / len(turns) if turns else 0.0
        return {
            "turn_count": len(turns),
            "total_cost_usd": round(total_cost, 6),
            "avg_cost_usd": round(avg_cost, 6),
            "total_tokens_in": total_tokens_in,
            "total_tokens_out": total_tokens_out,
            "total_cache_savings_usd": round(total_cache_savings, 6),
        }


# Module-level singleton
collector = ObservabilityCollector()


# ---------------------------------------------------------------------------
# SSE formatting helpers
# ---------------------------------------------------------------------------

def format_sse(event_type: str, data: dict[str, Any]) -> str:
    """Format a server-sent event."""
    payload = json.dumps(data, default=str)
    return f"event: {event_type}\ndata: {payload}\n\n"
