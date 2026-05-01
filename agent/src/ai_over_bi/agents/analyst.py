"""
AnalystAgent — period comparison, industry benchmarking, and insight generation.

Loads instructions from prompts/analyst.md.
Tools: compare_periods, get_industry_context, render_surface
"""

import logging
from pathlib import Path

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

from ai_over_bi.config import settings
from ai_over_bi.tools.analyst import compare_periods, get_industry_context

logger = logging.getLogger(__name__)

_INSTRUCTION = (Path(__file__).parent / "prompts" / "analyst.md").read_text().strip()


def build_analyst_agent(render_surface_tool) -> LlmAgent:
    """Build the AnalystAgent.

    Args:
        render_surface_tool: The render_surface tool function — passed in to avoid
                             circular imports between agents and tools.
    """
    agent = LlmAgent(
        name="analyst_agent",
        model=LiteLlm(model=f"anthropic/{settings.ORCHESTRATOR_MODEL}"),
        instruction=_INSTRUCTION,
        tools=[compare_periods, get_industry_context, render_surface_tool],
    )
    logger.info("AnalystAgent built", extra={"model": settings.ORCHESTRATOR_MODEL})
    return agent
