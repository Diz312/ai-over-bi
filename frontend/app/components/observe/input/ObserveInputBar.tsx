"use client";
/**
 * ObserveInputBar — bottom input bar on the observe page.
 *
 * Calls the ADK backend directly via AG-UI RunAgentInput (POST /agent),
 * parses the SSE response stream for AG-UI events, and forwards them to
 * the observability collector at /observe/agui/{session_id}.
 *
 * Bypasses CopilotKit deliberately — the observe page is a standalone runner.
 */

import { useState, useRef } from "react";
import { useObserveStore } from "../../../../lib/observe/store";
import {
  COLOR_TEXT_PRIMARY,
  FONT_SM,
  INPUT_HEIGHT,
  PANEL_BG,
  PANEL_BORDER,
} from "../../../../lib/observe/theme";

const BACKEND = "http://localhost:8000";

export default function ObserveInputBar() {
  const [question, setQuestion] = useState("");
  const sessionId = useObserveStore((s) => s.sessionId);
  const isRunning = useObserveStore((s) => s.isRunning);
  const setIsRunning = useObserveStore((s) => s.setIsRunning);
  const resetNodeStates = useObserveStore((s) => s.resetNodeStates);
  const clearCurrentSpans = useObserveStore((s) => s.clearCurrentSpans);
  const clearAgUIEvents = useObserveStore((s) => s.clearAgUIEvents);
  const setSelectedTurnDetail = useObserveStore((s) => s.setSelectedTurnDetail);

  const abortRef = useRef<AbortController | null>(null);

  const runTurn = async (q: string) => {
    if (!q.trim() || isRunning) return;
    const trimmed = q.trim();
    setQuestion("");

    // Clear UI state for new turn
    resetNodeStates();
    clearCurrentSpans();
    clearAgUIEvents();
    setSelectedTurnDetail(null);

    // Signal turn start to backend observability
    let turnId = "";
    try {
      const startRes = await fetch(`${BACKEND}/observe/turn/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question: trimmed }),
      });
      const startData = await startRes.json();
      turnId = startData.turn_id;
      useObserveStore.getState().setCurrentTurn(turnId, trimmed, Date.now() / 1000);
    } catch {
      // non-fatal
    }

    setIsRunning(true);
    abortRef.current = new AbortController();

    const aguiEvents: Record<string, unknown>[] = [];
    const turnStartMs = Date.now();
    let ttftRecorded = false;

    try {
      // Call ADK backend directly with AG-UI RunAgentInput format.
      // threadId === sessionId so use_thread_id_as_session_id maps correctly.
      const response = await fetch(`${BACKEND}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          threadId: sessionId,
          runId: `run-${Date.now()}`,
          agentName: "ai_over_bi",
          messages: [
            {
              id: `msg-${Date.now()}`,
              role: "user",
              content: trimmed,
            },
          ],
          state: {},
          tools: [],
          context: [],
          forwardedProps: {},
        }),
      });

      if (!response.ok) {
        console.error("Agent run failed:", response.status, response.statusText);
        return;
      }

      // Parse SSE stream — collect AG-UI events
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw) as Record<string, unknown>;
              if (parsed.type) {
                const ts = Date.now();
                aguiEvents.push({ ...parsed, _ts: ts });
                // Record TTFT on first text content event
                if (!ttftRecorded && parsed.type === "TEXT_MESSAGE_CONTENT") {
                  ttftRecorded = true;
                  const ttft = ts - turnStartMs;
                  useObserveStore.getState().setTtft(ttft);
                  // Also tell the backend
                  fetch(`${BACKEND}/observe/turn/ttft`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: sessionId, ttft_ms: ttft }),
                  }).catch(() => {});
                }
              }
            } catch {
              // not JSON
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Agent run error:", err);
      }
    } finally {
      setIsRunning(false);

      // Forward collected AG-UI events to the observability backend
      if (aguiEvents.length > 0) {
        fetch(`${BACKEND}/observe/agui/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aguiEvents),
        }).catch(() => {});
      }

      // Signal turn end to backend
      if (turnId) {
        fetch(`${BACKEND}/observe/turn/end/${sessionId}`, { method: "POST" }).catch(() => {});
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runTurn(question);
    }
  };

  return (
    <div
      style={{
        height: INPUT_HEIGHT,
        background: PANEL_BG,
        borderTop: `1px solid ${PANEL_BORDER}`,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask the BI agent anything about QuickBite FY2024..."
        disabled={isRunning}
        style={{
          flex: 1,
          fontSize: FONT_SM,
          padding: "8px 12px",
          border: `1px solid ${PANEL_BORDER}`,
          borderRadius: 6,
          outline: "none",
          background: isRunning ? "#F9FAFB" : "white",
          color: COLOR_TEXT_PRIMARY,
        }}
      />
      <button
        onClick={() => runTurn(question)}
        disabled={isRunning || !question.trim()}
        style={{
          fontSize: FONT_SM,
          padding: "8px 18px",
          borderRadius: 6,
          border: "none",
          background: isRunning ? "#9CA3AF" : "#6366F1",
          color: "white",
          cursor: isRunning || !question.trim() ? "not-allowed" : "pointer",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {isRunning ? "Running..." : "Run"}
      </button>
      {isRunning && (
        <button
          onClick={() => abortRef.current?.abort()}
          style={{
            fontSize: FONT_SM,
            padding: "8px 12px",
            borderRadius: 6,
            border: `1px solid #EF4444`,
            background: "white",
            color: "#EF4444",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Stop
        </button>
      )}
    </div>
  );
}
