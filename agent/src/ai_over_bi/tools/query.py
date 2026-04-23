"""
QueryAgent tools — read-only SQLite access for daily and quarterly sales data.

These tools are registered on the data_query_agent sub-agent. They return raw
tabular data to the LLM for it to reason about, and do NOT write to state.
State is only written by save_visualizations() in analyst.py.
"""

import logging
import sqlite3
from typing import Any

from google.adk.tools import ToolContext

from ai_over_bi.config import settings

logger = logging.getLogger(__name__)

_VALID_REGIONS = {"Northeast", "Southeast", "Midwest", "Southwest", "West"}
_VALID_METRICS = {"net_sales", "guest_count", "avg_check"}
_VALID_QUARTERS = {"Q1", "Q2", "Q3", "Q4"}
_VALID_GROUP_BY_DAILY = {"day", "week", "month", "store", "region"}
_VALID_GROUP_BY_QTRLY = {"quarter", "store", "region"}


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def query_daily_sales(
    date_from: str | None,
    date_to: str | None,
    regions: list[str] | None,
    store_ids: list[int] | None,
    group_by: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Query daily sales and guest count data from the FY2024 store database.

    Use this tool when the analyst asks about daily or monthly trends,
    weekly patterns, or needs granular time-series data.

    Args:
        date_from: Start date in YYYY-MM-DD format (inclusive). Use "2024-01-01" for Q1 start.
        date_to:   End date in YYYY-MM-DD format (inclusive). Use "2024-12-31" for year end.
        regions:   Filter by region(s). Valid values: ["Northeast", "Southeast", "Midwest", "Southwest", "West"].
                   Pass null to include all regions.
        store_ids: Filter by specific store IDs (1–100). Pass null to include all stores.
        group_by:  Aggregation level. One of: "day", "week", "month", "store", "region".
                   - "day"    → one row per date (use for short date ranges only)
                   - "week"   → weekly aggregates
                   - "month"  → monthly aggregates (recommended for full-year views)
                   - "store"  → total per store over the date range
                   - "region" → total per region over the date range
        tool_context: Injected by ADK — do not pass.

    Returns:
        Dict with "rows" (list of dicts) and "row_count".
        Each row contains: label, net_sales, guest_count, avg_check.
    """
    # Sanitise group_by
    if group_by not in _VALID_GROUP_BY_DAILY:
        group_by = "month"

    inv = tool_context._invocation_context
    tool_context.state["status"] = "querying"
    tool_context.state["session_id"] = inv.session.id

    params: list[Any] = []
    where: list[str] = []

    if date_from:
        where.append("d.date >= ?")
        params.append(date_from)
    if date_to:
        where.append("d.date <= ?")
        params.append(date_to)
    if regions:
        safe_regions = [r for r in regions if r in _VALID_REGIONS]
        if safe_regions:
            placeholders = ",".join("?" * len(safe_regions))
            where.append(f"s.region IN ({placeholders})")
            params.extend(safe_regions)
    if store_ids:
        placeholders = ",".join("?" * len(store_ids))
        where.append(f"d.store_id IN ({placeholders})")
        params.extend(store_ids)

    where_clause = "WHERE " + " AND ".join(where) if where else ""

    # Build SELECT based on group_by
    if group_by == "day":
        select = "d.date AS label"
        group = "d.date"
        order = "d.date"
    elif group_by == "week":
        select = "strftime('%Y-W%W', d.date) AS label"
        group = "strftime('%Y-W%W', d.date)"
        order = "label"
    elif group_by == "month":
        select = "strftime('%Y-%m', d.date) AS label"
        group = "strftime('%Y-%m', d.date)"
        order = "label"
    elif group_by == "store":
        select = "s.store_name AS label"
        group = "d.store_id"
        order = "net_sales DESC"
    else:  # region
        select = "s.region AS label"
        group = "s.region"
        order = "net_sales DESC"

    sql = f"""
        SELECT
            {select},
            ROUND(SUM(d.net_sales), 2)   AS net_sales,
            SUM(d.guest_count)           AS guest_count,
            ROUND(SUM(d.net_sales) / NULLIF(SUM(d.guest_count), 0), 2) AS avg_check
        FROM daily_sales d
        JOIN stores s ON s.store_id = d.store_id
        {where_clause}
        GROUP BY {group}
        ORDER BY {order}
    """

    with _conn() as conn:
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]

    logger.info(
        "query_daily_sales",
        extra={"group_by": group_by, "row_count": len(rows), "session_id": inv.session.id},
    )
    return {"rows": rows, "row_count": len(rows)}


def query_quarterly_sales(
    quarters: list[str] | None,
    regions: list[str] | None,
    store_ids: list[int] | None,
    group_by: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Query quarterly aggregated sales data from the FY2024 store database.

    Use this tool when the analyst asks about quarterly performance, period
    comparisons, or regional/store rankings by quarter.

    Args:
        quarters:  Filter by quarter(s). Valid values: ["Q1", "Q2", "Q3", "Q4"].
                   Pass null to include all quarters.
        regions:   Filter by region(s). Valid values: ["Northeast", "Southeast", "Midwest", "Southwest", "West"].
                   Pass null to include all regions.
        store_ids: Filter by specific store IDs (1–100). Pass null to include all stores.
        group_by:  Aggregation level. One of: "quarter", "store", "region".
                   - "quarter" → totals per quarter (chain-wide or filtered)
                   - "store"   → totals per store over specified quarters
                   - "region"  → totals per region over specified quarters
        tool_context: Injected by ADK — do not pass.

    Returns:
        Dict with "rows" (list of dicts) and "row_count".
        Each row contains: label, net_sales, guest_count, avg_check.
    """
    if group_by not in _VALID_GROUP_BY_QTRLY:
        group_by = "quarter"

    inv = tool_context._invocation_context
    tool_context.state["status"] = "querying"
    tool_context.state["session_id"] = inv.session.id

    params: list[Any] = []
    where: list[str] = ["q.fiscal_year = 2024"]

    if quarters:
        safe_quarters = [qt for qt in quarters if qt in _VALID_QUARTERS]
        if safe_quarters:
            placeholders = ",".join("?" * len(safe_quarters))
            where.append(f"q.quarter IN ({placeholders})")
            params.extend(safe_quarters)
    if regions:
        safe_regions = [r for r in regions if r in _VALID_REGIONS]
        if safe_regions:
            placeholders = ",".join("?" * len(safe_regions))
            where.append(f"s.region IN ({placeholders})")
            params.extend(safe_regions)
    if store_ids:
        placeholders = ",".join("?" * len(store_ids))
        where.append(f"q.store_id IN ({placeholders})")
        params.extend(store_ids)

    where_clause = "WHERE " + " AND ".join(where)

    if group_by == "quarter":
        select = "q.quarter AS label"
        group = "q.quarter"
        order = "q.quarter"
    elif group_by == "store":
        select = "s.store_name AS label"
        group = "q.store_id"
        order = "net_sales DESC"
    else:  # region
        select = "s.region AS label"
        group = "s.region"
        order = "net_sales DESC"

    sql = f"""
        SELECT
            {select},
            ROUND(SUM(q.net_sales), 2)   AS net_sales,
            SUM(q.guest_count)           AS guest_count,
            ROUND(SUM(q.net_sales) / NULLIF(SUM(q.guest_count), 0), 2) AS avg_check
        FROM quarterly_sales q
        JOIN stores s ON s.store_id = q.store_id
        {where_clause}
        GROUP BY {group}
        ORDER BY {order}
    """

    with _conn() as conn:
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]

    logger.info(
        "query_quarterly_sales",
        extra={"group_by": group_by, "row_count": len(rows), "session_id": inv.session.id},
    )
    return {"rows": rows, "row_count": len(rows)}
