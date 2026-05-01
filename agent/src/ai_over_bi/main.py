"""
AI over BI — FastAPI application entry point.

Mounts:
  POST /agent  — AG-UI streaming endpoint (CopilotKit ↔ ADK)
  GET  /health — liveness probe
  GET  /routes — lists all registered routes (dev utility)

Swagger UI:  http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import uvicorn
from ag_ui_adk import add_adk_fastapi_endpoint
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from pydantic import BaseModel

from ai_over_bi.agents.orchestrator import build_adk_agent
from ai_over_bi.config import settings
from ai_over_bi.logging_config import setup_logging

setup_logging(settings.LOG_LEVEL)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Ensure the database exists before accepting traffic
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
    ),
    contact={"name": "AI over BI", "url": "https://github.com/Diz312/gen-ui"},
    lifespan=lifespan,
    openapi_tags=[
        {"name": "meta", "description": "Service health and introspection"},
        {"name": "agent", "description": "AG-UI streaming agent endpoint"},
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
