"use client";
/**
 * useTurnHistory — loads persisted turns + session totals from backend.
 * Also loads static prompt token counts once on mount.
 */

import { useEffect } from "react";
import { useObserveStore } from "../store";
import type { SessionTotals, StaticTokens, TurnSummary } from "../types";

const BACKEND = "http://localhost:8000";

export function useTurnHistory() {
  const sessionId = useObserveStore((s) => s.sessionId);
  const setTurnHistory = useObserveStore((s) => s.setTurnHistory);
  const setSessionTotals = useObserveStore((s) => s.setSessionTotals);
  const setStaticTokens = useObserveStore((s) => s.setStaticTokens);

  // Load static tokens once
  useEffect(() => {
    fetch(`${BACKEND}/observe/static_tokens`)
      .then((r) => r.json())
      .then((data: StaticTokens) => setStaticTokens(data))
      .catch(() => {});
  }, []);

  // Load turn history whenever sessionId changes
  useEffect(() => {
    if (!sessionId) return;

    const load = () => {
      fetch(`${BACKEND}/observe/turns/${sessionId}`)
        .then((r) => r.json())
        .then((turns: TurnSummary[]) => setTurnHistory(turns))
        .catch(() => {});

      fetch(`${BACKEND}/observe/session/${sessionId}/totals`)
        .then((r) => r.json())
        .then((totals: SessionTotals) => setSessionTotals(totals))
        .catch(() => {});
    };

    load();
  }, [sessionId]);
}

/** Fetch full turn detail by turn_id */
export async function fetchTurnDetail(turnId: string) {
  const r = await fetch(`${BACKEND}/observe/turns/detail/${turnId}`);
  if (!r.ok) return null;
  return r.json();
}

/** Search / filter turns */
export async function searchTurns(params: {
  sessionId?: string;
  query?: string;
  errorsOnly?: boolean;
  minCost?: number;
  maxCost?: number;
}) {
  const sp = new URLSearchParams();
  if (params.sessionId) sp.set("session_id", params.sessionId);
  if (params.query) sp.set("query", params.query);
  if (params.errorsOnly) sp.set("errors_only", "true");
  if (params.minCost !== undefined) sp.set("min_cost", String(params.minCost));
  if (params.maxCost !== undefined) sp.set("max_cost", String(params.maxCost));
  const r = await fetch(`${BACKEND}/observe/turns/search?${sp}`);
  if (!r.ok) return [];
  return r.json();
}
