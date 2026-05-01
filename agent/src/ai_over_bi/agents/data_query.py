"""
DataQueryAgent — raw data retrieval and visualization rendering.

Loads instructions from prompts/data_query.md.
Tools: query_daily_sales, query_quarterly_sales, render_surface
"""

import logging

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

from ai_over_bi.agents.prompt_loader import load_prompt
from ai_over_bi.config import settings
from ai_over_bi.tools.query import query_daily_sales, query_quarterly_sales

logger = logging.getLogger(__name__)

_INSTRUCTION = load_prompt("data_query.md")


def build_data_query_agent(render_surface_tool) -> LlmAgent:
    """Build the DataQueryAgent.

    Args:
        render_surface_tool: The render_surface tool function — passed in to avoid
                             circular imports between agents and tools.
    """
    agent = LlmAgent(
        name="data_query_agent",
        model=LiteLlm(model=f"anthropic/{settings.QUERY_MODEL}"),
        instruction=_INSTRUCTION,
        tools=[query_daily_sales, query_quarterly_sales, render_surface_tool],
    )
    logger.info("DataQueryAgent built", extra={"model": settings.QUERY_MODEL})
    return agent
