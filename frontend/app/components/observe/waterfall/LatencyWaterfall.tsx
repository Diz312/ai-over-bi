"use client";
/**
 * LatencyWaterfall — collapsible Gantt chart showing span timing within a turn.
 */

import { useState } from "react";
import { useObserveStore } from "../../../../lib/observe/store";
import {
  COLOR_TEXT_MUTED,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  FONT_SM,
  FONT_XS,
  NODE_AGENT_ACCENT,
  NODE_TOOL_ACCENT,
  PANEL_BG,
  PANEL_BORDER,
  formatMs,
} from "../../../../lib/observe/theme";
import type { Span } from "../../../../lib/observe/types";

export default function LatencyWaterfall() {
  const [collapsed, setCollapsed] = useState(true);
  const currentSpans = useObserveStore((s) => s.currentSpans);
  const selectedTurnDetail = useObserveStore((s) => s.selectedTurnDetail);
  const turnStartedAt = useObserveStore((s) => s.turnStartedAt);
  const ttftMs = useObserveStore((s) => s.ttftMs);

  const spans = selectedTurnDetail?.spans ?? currentSpans;
  const startedAt = selectedTurnDetail?.started_at ?? turnStartedAt ?? 0;

  // Only show spans with timing data (exclude agent-type spans — use llm + tool)
  const timedSpans = spans.filter(
    (s) => (s.type === "llm" || s.type === "tool") && s.started_at && s.ended_at
  );

  if (timedSpans.length === 0 && !collapsed) {
    // nothing to show
  }

  // Compute turn duration
  const turnEndMs =
    timedSpans.length > 0
      ? Math.max(...timedSpans.map((s) => (s.ended_at ?? s.started_at) * 1000)) -
        startedAt * 1000
      : 0;

  const totalMs = Math.max(turnEndMs, 100);

  return (
    <div
      style={{
        background: PANEL_BG,
        borderTop: `1px solid ${PANEL_BORDER}`,
        flexShrink: 0,
        maxHeight: collapsed ? 36 : 200,
        transition: "max-height 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          height: 36,
          cursor: "pointer",
          userSelect: "none",
          borderBottom: collapsed ? "none" : `1px solid ${PANEL_BORDER}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: FONT_SM, fontWeight: 600, color: COLOR_TEXT_PRIMARY }}>
          Latency Waterfall
        </span>
        {!collapsed && turnEndMs > 0 && (
          <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
            {formatMs(turnEndMs)} total
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
          {collapsed ? "▼" : "▲"}
        </span>
      </div>

      {/* Gantt */}
      {!collapsed && (
        <div style={{ padding: "8px 12px", overflowY: "auto", maxHeight: 164 }}>
          {timedSpans.length === 0 && (
            <span style={{ fontSize: FONT_SM, color: COLOR_TEXT_MUTED }}>
              No timing data yet.
            </span>
          )}

          {/* Timeline header */}
          {timedSpans.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              {ttftMs != null && (
                <div
                  style={{
                    position: "relative",
                    height: 6,
                    background: "#F3F4F6",
                    borderRadius: 3,
                    marginBottom: 4,
                  }}
                >
                  {/* TTFT marker */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${(ttftMs / totalMs) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: "#3B82F6",
                    }}
                  />
                </div>
              )}

              {timedSpans.map((span) => (
                <WaterfallRow
                  key={span.span_id}
                  span={span}
                  turnStartedAt={startedAt}
                  totalMs={totalMs}
                />
              ))}

              <div style={{ marginTop: 4, fontSize: "10px", color: COLOR_TEXT_MUTED }}>
                ← 0ms{" "}
                {ttftMs != null && (
                  <span style={{ color: "#3B82F6" }}>│ TTFT {formatMs(ttftMs)} </span>
                )}
                {formatMs(totalMs)} →
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WaterfallRow({
  span,
  turnStartedAt,
  totalMs,
}: {
  span: Span;
  turnStartedAt: number;
  totalMs: number;
}) {
  const startMs = (span.started_at - turnStartedAt) * 1000;
  const endMs = span.ended_at ? (span.ended_at - turnStartedAt) * 1000 : startMs + 10;
  const durationMs = endMs - startMs;

  const leftPct = (startMs / totalMs) * 100;
  const widthPct = Math.max(0.5, (durationMs / totalMs) * 100);

  const color = span.type === "llm" ? NODE_AGENT_ACCENT : NODE_TOOL_ACCENT;
  const label =
    span.type === "llm"
      ? `${span.agent_name} LLM`
      : `${span.tool_name ?? "tool"}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <span
        style={{
          fontSize: "10px",
          color: COLOR_TEXT_SECONDARY,
          width: 130,
          flexShrink: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 10, background: "#F3F4F6", borderRadius: 3, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            height: "100%",
            background: span.error ? "#EF4444" : color,
            borderRadius: 3,
            opacity: 0.85,
          }}
        />
      </div>
      <span style={{ fontSize: "10px", color: COLOR_TEXT_MUTED, width: 40, flexShrink: 0, textAlign: "right" }}>
        {formatMs(durationMs)}
      </span>
    </div>
  );
}
