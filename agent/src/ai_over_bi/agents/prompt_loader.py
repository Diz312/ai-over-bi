"""
Prompt loader — reads agent prompts from .md and injects shared snippets.

Agents call `load_prompt("data_query.md")` to get a fully-resolved instruction
string. The loader substitutes a fixed set of placeholders before returning:

  {viz_catalog}          → catalog.format_catalog_for_prompt()
  {metric_display_rules} → contents of _metric_display_rules.md

Why this layer exists:
- Prompt authors edit one .md file per agent without duplicating shared content
- The viz catalog is auto-injected, so adding a new viz doesn't require touching prompts
- Backend devs control catalog content; prompt engineers control persona/workflow
- All sub-snippets (files starting with `_`) are convention-only — not loaded
  directly by any agent

Substitution uses plain str.replace() on explicit placeholders, NOT str.format().
This means literal `{` and `}` in markdown content (e.g. JSON examples) are safe.
"""

from pathlib import Path

from ai_over_bi.catalog import format_catalog_for_prompt

_PROMPTS_DIR = Path(__file__).parent / "prompts"


def _read(name: str) -> str:
    """Read a prompt file from agents/prompts/ and strip surrounding whitespace."""
    return (_PROMPTS_DIR / name).read_text().strip()


def load_prompt(name: str) -> str:
    """Load an agent prompt and substitute shared snippets.

    Args:
        name: Filename of the prompt under agents/prompts/ (e.g. "data_query.md").
              Files starting with `_` are sub-snippets and should not be loaded
              via this function — they are pulled in via placeholders instead.

    Returns:
        Fully-resolved prompt string ready to pass to LlmAgent(instruction=...).
    """
    template = _read(name)

    # Resolve placeholders. Order doesn't matter — each is a unique literal token.
    substitutions: dict[str, str] = {
        "{viz_catalog}":          format_catalog_for_prompt(),
        "{metric_display_rules}": _read("_metric_display_rules.md"),
    }

    resolved = template
    for placeholder, value in substitutions.items():
        resolved = resolved.replace(placeholder, value)

    return resolved


__all__ = ["load_prompt"]
