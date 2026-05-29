"""
observe_db — SQLite persistence for observability turn traces.

Uses a separate observe.db alongside store_data.db.
All I/O is run in a thread pool via asyncio.to_thread to avoid blocking.

Schema:
  observe_turns  — one row per completed turn (summary + full JSON blob)
"""

import asyncio
import json
import logging
import sqlite3
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

_DB_PATH = Path(__file__).parent / "data" / "observe.db"

_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS observe_turns (
    turn_id       TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    question      TEXT,
    started_at    REAL,
    ended_at      REAL,
    elapsed_ms    INTEGER,
    ttft_ms       INTEGER,
    total_cost    REAL,
    tokens_in     INTEGER,
    tokens_out    INTEGER,
    tokens_cached INTEGER,
    cache_savings REAL,
    agents_invoked TEXT,
    error         TEXT,
    spans_json    TEXT,
    agui_events_json TEXT,
    created_at    REAL DEFAULT (unixepoch('now'))
);
CREATE INDEX IF NOT EXISTS idx_session ON observe_turns (session_id, started_at DESC);
"""


def _init_sync() -> None:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(_DB_PATH))
    try:
        con.executescript(_CREATE_SQL)
        con.commit()
    finally:
        con.close()


def _save_sync(turn_dict: dict[str, Any]) -> None:
    con = sqlite3.connect(str(_DB_PATH))
    try:
        con.execute(
            """
            INSERT OR REPLACE INTO observe_turns (
                turn_id, session_id, question,
                started_at, ended_at, elapsed_ms, ttft_ms,
                total_cost, tokens_in, tokens_out, tokens_cached, cache_savings,
                agents_invoked, error, spans_json, agui_events_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                turn_dict["turn_id"],
                turn_dict["session_id"],
                turn_dict.get("question", ""),
                turn_dict.get("started_at"),
                turn_dict.get("ended_at"),
                turn_dict.get("elapsed_ms"),
                turn_dict.get("ttft_ms"),
                turn_dict.get("total_cost", 0.0),
                turn_dict.get("total_tokens_in", 0),
                turn_dict.get("total_tokens_out", 0),
                turn_dict.get("total_tokens_cached", 0),
                turn_dict.get("cache_savings_usd", 0.0),
                json.dumps(turn_dict.get("agents_invoked", [])),
                turn_dict.get("error"),
                json.dumps(turn_dict.get("spans", [])),
                json.dumps(turn_dict.get("agui_events", [])),
            ),
        )
        con.commit()
    finally:
        con.close()


def _get_turns_sync(session_id: str) -> list[dict[str, Any]]:
    if not _DB_PATH.exists():
        return []
    con = sqlite3.connect(str(_DB_PATH))
    con.row_factory = sqlite3.Row
    try:
        rows = con.execute(
            """
            SELECT turn_id, session_id, question,
                   started_at, ended_at, elapsed_ms, ttft_ms,
                   total_cost, tokens_in, tokens_out, tokens_cached, cache_savings,
                   agents_invoked, error
            FROM observe_turns
            WHERE session_id = ?
            ORDER BY started_at DESC
            LIMIT 200
            """,
            (session_id,),
        ).fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["agents_invoked"] = json.loads(d.get("agents_invoked") or "[]")
            result.append(d)
        return result
    finally:
        con.close()


def _get_all_turns_sync() -> list[dict[str, Any]]:
    """Retrieve turns across all sessions (for cross-session analytics)."""
    if not _DB_PATH.exists():
        return []
    con = sqlite3.connect(str(_DB_PATH))
    con.row_factory = sqlite3.Row
    try:
        rows = con.execute(
            """
            SELECT turn_id, session_id, question,
                   started_at, ended_at, elapsed_ms, ttft_ms,
                   total_cost, tokens_in, tokens_out, tokens_cached, cache_savings,
                   agents_invoked, error
            FROM observe_turns
            ORDER BY started_at DESC
            LIMIT 500
            """,
        ).fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["agents_invoked"] = json.loads(d.get("agents_invoked") or "[]")
            result.append(d)
        return result
    finally:
        con.close()


def _get_turn_detail_sync(turn_id: str) -> Optional[dict[str, Any]]:
    if not _DB_PATH.exists():
        return None
    con = sqlite3.connect(str(_DB_PATH))
    con.row_factory = sqlite3.Row
    try:
        row = con.execute(
            "SELECT * FROM observe_turns WHERE turn_id = ?", (turn_id,)
        ).fetchone()
        if row is None:
            return None
        d = dict(row)
        d["agents_invoked"] = json.loads(d.get("agents_invoked") or "[]")
        d["spans"] = json.loads(d.get("spans_json") or "[]")
        d["agui_events"] = json.loads(d.get("agui_events_json") or "[]")
        d.pop("spans_json", None)
        d.pop("agui_events_json", None)
        return d
    finally:
        con.close()


def _search_turns_sync(
    session_id: Optional[str],
    query: Optional[str],
    errors_only: bool,
    min_cost: Optional[float],
    max_cost: Optional[float],
) -> list[dict[str, Any]]:
    if not _DB_PATH.exists():
        return []
    con = sqlite3.connect(str(_DB_PATH))
    con.row_factory = sqlite3.Row
    try:
        clauses: list[str] = []
        params: list[Any] = []
        if session_id:
            clauses.append("session_id = ?")
            params.append(session_id)
        if query:
            clauses.append("question LIKE ?")
            params.append(f"%{query}%")
        if errors_only:
            clauses.append("error IS NOT NULL")
        if min_cost is not None:
            clauses.append("total_cost >= ?")
            params.append(min_cost)
        if max_cost is not None:
            clauses.append("total_cost <= ?")
            params.append(max_cost)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = con.execute(
            f"""
            SELECT turn_id, session_id, question,
                   started_at, ended_at, elapsed_ms, ttft_ms,
                   total_cost, tokens_in, tokens_out, tokens_cached, cache_savings,
                   agents_invoked, error
            FROM observe_turns
            {where}
            ORDER BY started_at DESC
            LIMIT 200
            """,
            params,
        ).fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["agents_invoked"] = json.loads(d.get("agents_invoked") or "[]")
            result.append(d)
        return result
    finally:
        con.close()


# ---------------------------------------------------------------------------
# Async public API
# ---------------------------------------------------------------------------


async def init_db() -> None:
    """Initialise the observe database (create tables if needed)."""
    await asyncio.to_thread(_init_sync)
    logger.info("observe.db initialised", extra={"path": str(_DB_PATH)})


async def save_turn(turn_dict: dict[str, Any]) -> None:
    try:
        await asyncio.to_thread(_save_sync, turn_dict)
    except Exception as exc:
        logger.error("Failed to persist turn", extra={"error": str(exc)})


async def get_turns(session_id: str) -> list[dict[str, Any]]:
    return await asyncio.to_thread(_get_turns_sync, session_id)


async def get_all_turns() -> list[dict[str, Any]]:
    return await asyncio.to_thread(_get_all_turns_sync)


async def get_turn_detail(turn_id: str) -> Optional[dict[str, Any]]:
    return await asyncio.to_thread(_get_turn_detail_sync, turn_id)


async def search_turns(
    session_id: Optional[str] = None,
    query: Optional[str] = None,
    errors_only: bool = False,
    min_cost: Optional[float] = None,
    max_cost: Optional[float] = None,
) -> list[dict[str, Any]]:
    return await asyncio.to_thread(
        _search_turns_sync, session_id, query, errors_only, min_cost, max_cost
    )
