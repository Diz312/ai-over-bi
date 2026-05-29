"""
AI over BI — FastAPI application entry point.

Mounts:
  POST /agent              — AG-UI streaming endpoint (CopilotKit ↔ ADK)
  GET  /health             — liveness probe
  GET  /routes             — lists all registered routes (dev utility)
  GET  /observe/stream/{session_id}          — SSE observability stream
  POST /observe/agui/{session_id}            — receive AG-UI events from route.ts
  GET  /observe/turns/{session_id}           — persisted turn summaries for session
  GET  /observe/turns/detail/{turn_id}       — full turn detail
  GET  /observe/turns/search                 — search/filter turns
  GET  /observe/session/{session_id}/totals  — session-level aggregates
  POST /observe/turn/start                   — signal turn start (from ObserveInputBar)
  POST /observe/turn/end/{session_id}        — signal turn end

Swagger UI:  http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator, Optional

import uvicorn
from ag_ui_adk import add_adk_fastapi_endpoint
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel

from ai_over_bi.agents.orchestrator import build_adk_agent
from ai_over_bi.catalog import format_catalog_for_prompt
from ai_over_bi.config import settings
from ai_over_bi.logging_config import setup_logging
from ai_over_bi.observe_db import get_all_turns, get_turn_detail, get_turns, init_db, save_turn, search_turns
from ai_over_bi.observability import (
    collector,
    format_sse,
    update_viz_catalog_tokens,
)

setup_logging(settings.LOG_LEVEL)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Initialise observability DB
    await init_db()

    # Update static viz_catalog token estimate now that catalog is loaded
    update_viz_catalog_tokens(format_catalog_for_prompt())

    db_path = Path(settings.DB_PATH)
    if not db_path.exists():
        logger.warning(
            "SQLite database not found — run `uv run ai-over-bi-seed` to generate it",
            extra={"db_path": str(db_path)},
        )
    logger.info(
        "AI over BI starting",
        extra={
            "host": settings.HOST,
            "port": settings.PORT,
            "orchestrator_model": settings.ORCHESTRATOR_MODEL,
            "analyst_model": settings.ANALYST_MODEL,
            "query_model": settings.QUERY_MODEL,
            "db_path": settings.DB_PATH,
        },
    )
    yield
    logger.info("AI over BI shutting down")


class HealthResponse(BaseModel):
    status: str
    service: str
    db_ready: bool


class RouteInfo(BaseModel):
    path: str
    methods: list[str]
    name: str


class RoutesResponse(BaseModel):
    count: int
    routes: list[RouteInfo]


app = FastAPI(
    title="AI over BI Agent API",
    version="0.1.0",
    description=(
        "AI-powered business intelligence backend.\n\n"
        "- `POST /agent` — AG-UI streaming endpoint consumed by CopilotKit frontend\n"
        "- `GET /health` — liveness probe\n"
        "- `GET /routes` — registered route inspection\n"
        "- `GET /observe/stream/{session_id}` — SSE observability stream\n"
    ),
    contact={"name": "AI over BI", "url": "https://github.com/Diz312/gen-ui"},
    lifespan=lifespan,
    openapi_tags=[
        {"name": "meta", "description": "Service health and introspection"},
        {"name": "agent", "description": "AG-UI streaming agent endpoint"},
        {"name": "observe", "description": "Observability plane endpoints"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

adk_agent = build_adk_agent()
add_adk_fastapi_endpoint(app, adk_agent, path="/agent")


# ---------------------------------------------------------------------------
# Meta endpoints
# ---------------------------------------------------------------------------


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["meta"],
    summary="Liveness probe",
)
async def health() -> HealthResponse:
    db_ready = Path(settings.DB_PATH).exists()
    return HealthResponse(status="ok", service="ai-over-bi", db_ready=db_ready)


@app.get(
    "/routes",
    response_model=RoutesResponse,
    tags=["meta"],
    summary="List all registered routes",
)
async def list_routes() -> RoutesResponse:
    routes = [
        RouteInfo(
            path=route.path,
            methods=sorted(route.methods or []),
            name=route.name or "",
        )
        for route in app.routes
        if isinstance(route, APIRoute)
    ]
    return RoutesResponse(count=len(routes), routes=routes)


# ---------------------------------------------------------------------------
# Observability SSE stream
# ---------------------------------------------------------------------------


@app.get(
    "/observe/stream/{session_id}",
    tags=["observe"],
    summary="SSE stream of observability events for a session",
)
async def observe_stream(session_id: str) -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        # Send a keep-alive comment immediately
        yield ": connected\n\n"

        q = collector.subscribe(session_id)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    # Keep-alive ping
                    yield ": ping\n\n"
                    continue

                if event is None:
                    break

                event_type = event.get("type", "event")
                yield format_sse(event_type, event)
        except asyncio.CancelledError:
            pass
        finally:
            collector.unsubscribe(session_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# AG-UI event ingestion (from route.ts interception)
# ---------------------------------------------------------------------------


@app.post(
    "/observe/agui/{session_id}",
    tags=["observe"],
    summary="Receive AG-UI events from the CopilotKit route handler",
)
async def ingest_agui_events(session_id: str, request: Request) -> dict[str, str]:
    try:
        body = await request.json()
        events: list[dict[str, Any]] = body if isinstance(body, list) else [body]
        for event in events:
            collector.record_agui_event(session_id, event)
    except Exception as exc:
        logger.debug("agui event parse error", extra={"error": str(exc)})
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Turn lifecycle signals (from ObserveInputBar)
# ---------------------------------------------------------------------------


class TurnStartRequest(BaseModel):
    session_id: str
    question: str


@app.post(
    "/observe/turn/start",
    tags=["observe"],
    summary="Signal the start of a new observed turn",
)
async def turn_start(body: TurnStartRequest) -> dict[str, str]:
    turn = collector.start_turn(body.session_id, body.question)
    return {"turn_id": turn.turn_id}


class TurnTtftRequest(BaseModel):
    session_id: str
    ttft_ms: int


@app.post(
    "/observe/turn/ttft",
    tags=["observe"],
    summary="Record time-to-first-token for the current turn",
)
async def turn_ttft(body: TurnTtftRequest) -> dict[str, str]:
    state = collector._sessions.get(body.session_id)
    if state and state.current_turn and state.current_turn.ttft_ms is None:
        state.current_turn.ttft_ms = body.ttft_ms
    return {"status": "ok"}


@app.post(
    "/observe/turn/end/{session_id}",
    tags=["observe"],
    summary="Signal the end of a turn and persist it",
)
async def turn_end(session_id: str, error: Optional[str] = None) -> dict[str, Any]:
    turn = collector.end_turn(session_id, error=error)
    if turn:
        await save_turn(turn.to_dict())
        return {"turn_id": turn.turn_id, "total_cost": turn.total_cost}
    return {"turn_id": None}


# ---------------------------------------------------------------------------
# Turn history queries
# ---------------------------------------------------------------------------


@app.get(
    "/observe/turns/{session_id}",
    tags=["observe"],
    summary="Turn summaries for a session (most recent first)",
)
async def session_turns(session_id: str) -> list[dict[str, Any]]:
    # Merge in-memory (current session) with persisted turns from other sessions/restarts
    in_memory = collector.get_turns(session_id)
    persisted = await get_turns(session_id)
    # Deduplicate by turn_id (in-memory wins for current session)
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for t in in_memory:
        seen.add(t["turn_id"])
        result.append(t)
    for t in persisted:
        if t["turn_id"] not in seen:
            result.append(t)
    return result


@app.get(
    "/observe/turns/detail/{turn_id}",
    tags=["observe"],
    summary="Full turn detail including all spans and AG-UI events",
)
async def turn_detail(turn_id: str) -> dict[str, Any]:
    # Check all sessions in memory first
    for session_id in list(collector._sessions.keys()):
        d = collector.get_turn_detail(session_id, turn_id)
        if d:
            return d
    # Fall back to DB
    d = await get_turn_detail(turn_id)
    if d:
        return d
    return {}


@app.get(
    "/observe/turns/search",
    tags=["observe"],
    summary="Search and filter turns",
)
async def turns_search(
    session_id: Optional[str] = None,
    query: Optional[str] = None,
    errors_only: bool = False,
    min_cost: Optional[float] = None,
    max_cost: Optional[float] = None,
) -> list[dict[str, Any]]:
    return await search_turns(
        session_id=session_id,
        query=query,
        errors_only=errors_only,
        min_cost=min_cost,
        max_cost=max_cost,
    )


@app.get(
    "/observe/session/{session_id}/totals",
    tags=["observe"],
    summary="Session-level aggregated metrics",
)
async def session_totals(session_id: str) -> dict[str, Any]:
    return collector.get_session_totals(session_id)


@app.get(
    "/observe/static_tokens",
    tags=["observe"],
    summary="Static prompt component token counts",
)
async def static_tokens() -> dict[str, int]:
    from ai_over_bi.observability import STATIC_PROMPT_TOKENS
    return STATIC_PROMPT_TOKENS


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    """Entry point for `uv run ai-over-bi-serve`."""
    uvicorn.run(
        "ai_over_bi.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_config=None,
    )


if __name__ == "__main__":
    main()
