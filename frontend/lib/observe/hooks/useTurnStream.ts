"use client";
/**
 * useTurnStream — subscribes to the backend SSE stream for a session.
 *
 * Parses span_start / span_end / agui_event / turn_start / turn_complete events
 * and feeds them into the Zustand store which drives all observe UI components.
 */

import { useEffect, useRef } from "react";
import { useObserveStore } from "../store";
import type { AgUIEvent, Span, TurnSummary } from "../types";

const BACKEND = "http://localhost:8000";

export function useTurnStream() {
  const sessionId = useObserveStore((s) => s.sessionId);
  const addSpan = useObserveStore((s) => s.addSpan);
  const updateSpan = useObserveStore((s) => s.updateSpan);
  const addAgUIEvent = useObserveStore((s) => s.addAgUIEvent);
  const addTurnToHistory = useObserveStore((s) => s.addTurnToHistory);
  const setNodeState = useObserveStore((s) => s.setNodeState);
  const resetNodeStates = useObserveStore((s) => s.resetNodeStates);
  const clearCurrentSpans = useObserveStore((s) => s.clearCurrentSpans);
  const clearAgUIEvents = useObserveStore((s) => s.clearAgUIEvents);
  const setCurrentTurn = useObserveStore((s) => s.setCurrentTurn);
  const setTtft = useObserveStore((s) => s.setTtft);
  const setIsRunning = useObserveStore((s) => s.setIsRunning);

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Close existing connection
    esRef.current?.close();

    const es = new EventSource(`${BACKEND}/observe/stream/${sessionId}`);
    esRef.current = es;

    es.addEventListener("turn_start", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const turn = data.turn as TurnSummary;
        clearCurrentSpans();
        clearAgUIEvents();
        resetNodeStates();
        setCurrentTurn(turn.turn_id, turn.question, turn.started_at);
        setIsRunning(true);
      } catch {}
    });

    es.addEventListener("span_start", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const span = data.span as Span;
        addSpan(span);

        // Update node state → running
        const nodeId = spanNodeId(span);
        if (nodeId) {
          setNodeState(nodeId, { status: "running", activeSpanId: span.span_id });
        }
      } catch {}
    });

    es.addEventListener("span_end", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const span = data.span as Span;
        updateSpan(span);

        const nodeId = spanNodeId(span);
        if (nodeId) {
          const status = span.error ? "error" : "done";
          if (span.type === "llm") {
            setNodeState(nodeId, {
              status,
              tokensIn: span.tokens_in,
              tokensOut: span.tokens_out,
              tokensCached: span.tokens_cached,
              costUsd: span.cost_usd,
              elapsedMs: span.elapsed_ms ?? undefined,
              contextUtilizationPct: span.context_utilization_pct ?? undefined,
              error: span.error ?? undefined,
            });
          } else if (span.type === "tool") {
            setNodeState(nodeId, {
              status,
              elapsedMs: span.elapsed_ms ?? undefined,
              error: span.error ?? undefined,
            });
          } else if (span.type === "agent") {
            // Agent done — keep existing metrics, update status only
            setNodeState(nodeId, { status });
          }
        }
      } catch {}
    });

    es.addEventListener("agui_event", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const event = data.event as AgUIEvent;
        addAgUIEvent({ ...event, _receivedAt: Date.now() });

        // Capture TTFT from first TEXT_MESSAGE_CONTENT
        if (event.type === "TEXT_MESSAGE_CONTENT") {
          const startedAt = useObserveStore.getState().turnStartedAt;
          if (startedAt && !useObserveStore.getState().ttftMs) {
            setTtft(Math.round(Date.now() - startedAt * 1000));
          }
        }
      } catch {}
    });

    es.addEventListener("turn_complete", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const turn = data.turn as TurnSummary;
        addTurnToHistory(turn);
        setIsRunning(false);
      } catch {}
    });

    es.onerror = () => {
      // EventSource will auto-reconnect; nothing to do
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a Span to the React Flow node ID it should update. */
function spanNodeId(span: Span): string | null {
  if (span.type === "agent" || span.type === "llm") {
    return span.agent_name;
  }
  if (span.type === "tool" && span.tool_name) {
    return span.tool_name;
  }
  return null;
}
