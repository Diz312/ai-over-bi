"""
ADK observability callbacks — wired onto every LlmAgent.

Callbacks capture:
  before_agent_callback  → agent entry time, sets context vars
  after_agent_callback   → agent exit time, emits agent span
  before_model_callback  → LLM call start, assembles prompt snapshot
  after_model_callback   → LLM call end, tokens, cost, thinking content
  before_tool_callback   → tool call start, full args
  after_tool_callback    → tool call end, full result

Context vars (current_session_id, current_agent_name, current_invocation_id)
are set in before_agent_callback and remain available for all downstream
callbacks within the same async task context.
"""

import logging
import time
from typing import Any, Optional

from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest, LlmResponse
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from google.genai import types

from ai_over_bi.observability import (
    collector,
    current_agent_name,
    current_invocation_id,
    current_session_id,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _safe_session_id(ctx: CallbackContext) -> str:
    try:
        return ctx.session.id
    except Exception:
        return current_session_id.get("")


def _safe_session_id_tool(ctx: ToolContext) -> str:
    try:
        return ctx.session.id  # type: ignore[attr-defined]
    except Exception:
        return current_session_id.get("")


def _extract_prompt_text(llm_request: LlmRequest) -> str:
    """Serialize LlmRequest contents + system instruction into a readable string."""
    parts: list[str] = []

    # System instruction
    try:
        si = llm_request.config.system_instruction
        if si:
            if isinstance(si, str):
                parts.append(f"[SYSTEM]\n{si}")
            elif hasattr(si, "parts"):
                text = " ".join(
                    p.text for p in si.parts if hasattr(p, "text") and p.text
                )
                if text:
                    parts.append(f"[SYSTEM]\n{text}")
    except Exception:
        pass

    # Conversation contents
    try:
        for content in llm_request.contents:
            role = getattr(content, "role", "unknown")
            content_parts = getattr(content, "parts", [])
            texts: list[str] = []
            for part in content_parts:
                if hasattr(part, "text") and part.text:
                    texts.append(part.text)
                elif hasattr(part, "function_call") and part.function_call:
                    fc = part.function_call
                    texts.append(f"[TOOL_CALL: {fc.name}({fc.args})]")
                elif hasattr(part, "function_response") and part.function_response:
                    fr = part.function_response
                    texts.append(f"[TOOL_RESULT: {fr.name} → {str(fr.response)[:500]}]")
            if texts:
                parts.append(f"[{role.upper()}]\n" + "\n".join(texts))
    except Exception:
        pass

    return "\n\n".join(parts)


def _extract_thinking_text(llm_response: LlmResponse) -> Optional[str]:
    """Extract thinking/reasoning text from LlmResponse content parts."""
    try:
        content = llm_response.content
        if content is None:
            return None
        thinking_parts: list[str] = []
        for part in getattr(content, "parts", []):
            # Check for thought=True flag (Gemini SDK style for thinking models)
            if getattr(part, "thought", False) and hasattr(part, "text") and part.text:
                thinking_parts.append(part.text)
        return "\n\n".join(thinking_parts) if thinking_parts else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Agent callbacks
# ---------------------------------------------------------------------------


def before_agent_callback(callback_context: CallbackContext) -> Optional[types.Content]:
    """Fires when an LlmAgent begins execution."""
    session_id = _safe_session_id(callback_context)
    agent_name = callback_context.agent_name
    invocation_id = callback_context.invocation_id

    # Propagate into context vars for downstream callbacks
    current_session_id.set(session_id)
    current_agent_name.set(agent_name)
    current_invocation_id.set(invocation_id)

    if session_id:
        collector.agent_start(session_id, agent_name, invocation_id)

    logger.debug(
        "agent_start",
        extra={"agent": agent_name, "session_id": session_id, "invocation_id": invocation_id},
    )
    return None  # do not intercept — let agent proceed normally


def after_agent_callback(callback_context: CallbackContext) -> Optional[types.Content]:
    """Fires when an LlmAgent finishes execution."""
    session_id = _safe_session_id(callback_context)
    invocation_id = callback_context.invocation_id

    if session_id:
        collector.agent_end(session_id, invocation_id)

    logger.debug(
        "agent_end",
        extra={"agent": callback_context.agent_name, "session_id": session_id},
    )
    return None


# ---------------------------------------------------------------------------
# Model callbacks
# ---------------------------------------------------------------------------


def before_model_callback(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Fires before each LLM API call — capture assembled prompt."""
    session_id = current_session_id.get("") or _safe_session_id(callback_context)
    agent_name = current_agent_name.get("") or callback_context.agent_name
    invocation_id = current_invocation_id.get("") or callback_context.invocation_id

    model = llm_request.model
    assembled_prompt = _extract_prompt_text(llm_request)

    if session_id:
        collector.llm_start(
            session_id=session_id,
            agent_name=agent_name,
            invocation_id=invocation_id,
            model=model,
            assembled_prompt=assembled_prompt,
        )

    logger.debug(
        "llm_start",
        extra={"agent": agent_name, "model": model, "session_id": session_id},
    )
    return None  # do not intercept the LLM call


def after_model_callback(
    callback_context: CallbackContext, llm_response: LlmResponse
) -> Optional[LlmResponse]:
    """Fires after each LLM API call — capture tokens, cost, thinking."""
    session_id = current_session_id.get("") or _safe_session_id(callback_context)
    invocation_id = current_invocation_id.get("") or callback_context.invocation_id

    tokens_in = 0
    tokens_out = 0
    tokens_cached = 0
    tokens_thinking = 0

    if llm_response.usage_metadata:
        um = llm_response.usage_metadata
        tokens_in = um.prompt_token_count or 0
        tokens_out = um.candidates_token_count or 0
        tokens_cached = um.cached_content_token_count or 0
        tokens_thinking = um.thoughts_token_count or 0

    thinking_text = _extract_thinking_text(llm_response)
    error = llm_response.error_message

    if session_id:
        collector.llm_end(
            session_id=session_id,
            invocation_id=invocation_id,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            tokens_cached=tokens_cached,
            tokens_thinking=tokens_thinking,
            thinking_text=thinking_text,
            error=error,
        )

    logger.debug(
        "llm_end",
        extra={
            "session_id": session_id,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "tokens_cached": tokens_cached,
        },
    )
    return None  # do not intercept the response


# ---------------------------------------------------------------------------
# Tool callbacks
# ---------------------------------------------------------------------------


def before_tool_callback(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
) -> Optional[dict[str, Any]]:
    """Fires before each tool call — capture full args."""
    session_id = current_session_id.get("") or _safe_session_id_tool(tool_context)
    agent_name = current_agent_name.get("")

    if session_id:
        # Store the span key in tool_context so after_tool_callback can retrieve it
        span, key = collector.tool_start(
            session_id=session_id,
            agent_name=agent_name,
            tool_name=tool.name,
            tool_args=dict(args),
        )
        # Stash key for retrieval in after_tool_callback
        try:
            tool_context.state["_obs_tool_key"] = key  # type: ignore[index]
        except Exception:
            pass

    logger.debug(
        "tool_start",
        extra={"tool": tool.name, "session_id": session_id},
    )
    return None  # do not intercept — let tool execute


def after_tool_callback(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
    tool_response: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Fires after each tool call — capture full result."""
    session_id = current_session_id.get("") or _safe_session_id_tool(tool_context)

    key: Optional[str] = None
    try:
        key = tool_context.state.get("_obs_tool_key")  # type: ignore[attr-defined]
    except Exception:
        pass

    # Fall back to finding by tool name if key is missing
    if not key and session_id:
        # Find most recent tool span for this tool
        state = collector._sessions.get(session_id)
        if state:
            for k, span in state.tool_spans.items():
                if span.tool_name == tool.name:
                    key = k
                    break

    if session_id and key:
        collector.tool_end(
            session_id=session_id,
            key=key,
            tool_result=tool_response,
        )

    logger.debug(
        "tool_end",
        extra={"tool": tool.name, "session_id": session_id},
    )
    return None  # do not intercept the response
