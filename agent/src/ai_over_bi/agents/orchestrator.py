"""
OrchestratorAgent — intent routing for AI over BI.

Loads instructions from prompts/orchestrator.md.
Builds the full ADK multi-agent hierarchy and wraps it in an ADKAgent for AG-UI.

Architecture:
  OrchestratorAgent (ai_over_bi)       — LlmAgent, Sonnet, routes intent
    ├── DataQueryAgent (data_query_agent) — raw data retrieval + render_surface
    └── AnalystAgent  (analyst_agent)    — comparison + insights + render_surface
"""

import logging

from ag_ui_adk import ADKAgent
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

from ai_over_bi.config import settings
from ai_over_bi.agents.data_query import build_data_query_agent
from ai_over_bi.agents.analyst import build_analyst_agent
from ai_over_bi.agents.prompt_loader import load_prompt
from ai_over_bi.tools.a2ui import render_surface

logger = logging.getLogger(__name__)

_INSTRUCTION = load_prompt("orchestrator.md")


def build_orchestrator() -> LlmAgent:
    """Build the full ADK multi-agent hierarchy."""
    data_query_agent = build_data_query_agent(render_surface)
    analyst_agent = build_analyst_agent(render_surface)

    orchestrator = LlmAgent(
        name="ai_over_bi",
        model=LiteLlm(model=f"anthropic/{settings.ORCHESTRATOR_MODEL}"),
        instruction=_INSTRUCTION,
        sub_agents=[data_query_agent, analyst_agent],
    )

    logger.info(
        "ADK agent hierarchy built",
        extra={
            "root": orchestrator.name,
            "orchestrator_model": settings.ORCHESTRATOR_MODEL,
            "sub_agents": [data_query_agent.name, analyst_agent.name]
        },
    )
    return orchestrator


def build_adk_agent() -> ADKAgent:
    """Wrap the orchestrator in an ADKAgent for AG-UI / CopilotKit integration."""
    orchestrator = build_orchestrator()
    return ADKAgent(
        adk_agent=orchestrator,
        app_name="ai_over_bi",
        user_id="demo_user",
        session_timeout_seconds=settings.SESSION_TIMEOUT_SECONDS,
        use_in_memory_services=True,
    )
