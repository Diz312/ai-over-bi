"use client";
/**
 * TurnSummaryBar — pinned bar above the React Flow canvas.
 * Shows aggregated metrics for the current (or selected) turn.
 */

import { useObserveStore } from "../../../../lib/observe/store";
import {
  COLOR_TEXT_MUTED,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  FONT_SM,
  FONT_XS,
  PANEL_BG,
  PANEL_BORDER,
  SUMMARY_HEIGHT,
  formatCost,
  formatMs,
  formatTokens,
} from "../../../../lib/observe/theme";

export default function TurnSummaryBar() {
  const currentSpans = useObserveStore((s) => s.currentSpans);
  const currentQuestion = useObserveStore((s) => s.currentQuestion);
  const ttftMs = useObserveStore((s) => s.ttftMs);
  const turnStartedAt = useObserveStore((s) => s.turnStartedAt);
  const isRunning = useObserveStore((s) => s.isRunning);
  const selectedTurnDetail = useObserveStore((s) => s.selectedTurnDetail);

  // Prefer selected historical turn; fall back to live
  const showSelected = !!selectedTurnDetail;
  const question = showSelected ? selectedTurnDetail!.question : currentQuestion;
  const spans = showSelected ? selectedTurnDetail!.spans : currentSpans;

  const llmSpans = spans.filter((s) => s.type === "llm");
  const totalTokensIn = llmSpans.reduce((a, s) => a + s.tokens_in, 0);
  const totalTokensOut = llmSpans.reduce((a, s) => a + s.tokens_out, 0);
  const totalTokensCached = llmSpans.reduce((a, s) => a + s.tokens_cached, 0);
  const totalCost = llmSpans.reduce((a, s) => a + s.cost_usd, 0);
  const agentsInvoked = [...new Set(llmSpans.map((s) => s.agent_name))];

  // Elapsed: for live turns compute from startedAt
  let elapsedMs: number | null = null;
  if (showSelected) {
    elapsedMs = selectedTurnDetail!.elapsed_ms;
  } else if (turnStartedAt && !isRunning) {
    elapsedMs = currentSpans.length > 0
      ? Math.max(...currentSpans.map((s) => (s.ended_at ?? 0) * 1000)) -
        turnStartedAt * 1000
      : null;
  }

  const cacheSavings =
    totalTokensCached > 0 ? totalTokensCached * 3.0 * 0.9 / 1_000_000 : 0;

  const hasData = totalTokensIn > 0 || totalCost > 0;

  return (
    <div
      style={{
        height: SUMMARY_HEIGHT,
        background: PANEL_BG,
        borderBottom: `1px solid ${PANEL_BORDER}`,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 20,
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      {/* Running indicator */}
      {isRunning && !showSelected && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#3B82F6",
              display: "inline-block",
              animation: "pulse 1s infinite",
            }}
          />
          <span style={{ fontSize: FONT_SM, color: "#3B82F6", fontWeight: 600 }}>Running</span>
        </div>
      )}

      {/* Question preview */}
      {question && (
        <span
          style={{
            fontSize: FONT_SM,
            color: COLOR_TEXT_SECONDARY,
            maxWidth: 240,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {question}
        </span>
      )}

      {!hasData && !isRunning && (
        <span style={{ fontSize: FONT_SM, color: COLOR_TEXT_MUTED }}>
          Run a turn to see metrics
        </span>
      )}

      {hasData && (
        <>
          {elapsedMs != null && (
            <SummaryItem label="Total" value={formatMs(elapsedMs)} />
          )}
          {ttftMs != null && (
            <SummaryItem label="TTFT" value={formatMs(ttftMs)} />
          )}
          <SummaryItem label="Tokens in" value={formatTokens(totalTokensIn)} />
          <SummaryItem label="Tokens out" value={formatTokens(totalTokensOut)} />
          {totalTokensCached > 0 && (
            <SummaryItem label="Cached" value={formatTokens(totalTokensCached)} highlight />
          )}
          <SummaryItem label="Cost" value={formatCost(totalCost)} />
          {cacheSavings > 0 && (
            <SummaryItem label="Saved" value={formatCost(cacheSavings)} highlight />
          )}
          {agentsInvoked.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>Agents:</span>
              {agentsInvoked.map((a) => (
                <span
                  key={a}
                  style={{
                    fontSize: FONT_XS,
                    background: "#EEF2FF",
                    color: "#6366F1",
                    borderRadius: 3,
                    padding: "1px 5px",
                    fontWeight: 600,
                  }}
                >
                  {a.replace("_agent", "").replace("ai_over_bi", "Orch")}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
      <span style={{ fontSize: "10px", color: COLOR_TEXT_MUTED }}>{label}</span>
      <span
        style={{
          fontSize: FONT_SM,
          fontWeight: 700,
          color: highlight ? "#10B981" : COLOR_TEXT_PRIMARY,
        }}
      >
        {value}
      </span>
    </div>
  );
}
