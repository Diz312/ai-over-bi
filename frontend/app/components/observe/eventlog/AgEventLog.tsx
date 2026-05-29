"use client";
/**
 * AgEventLog — collapsible DevTools-style AG-UI protocol inspector.
 *
 * Shows a chronological list of AG-UI events for the current (or selected) turn.
 * Each row is expandable to show the full raw JSON payload.
 * STATE_SNAPSHOT and TOOL_CALL_RESULT (with A2UI ops) are starred.
 */

import { useState, useEffect, useRef } from "react";
import { useObserveStore } from "../../../../lib/observe/store";
import {
  COLOR_TEXT_MUTED,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  FONT_SM,
  FONT_XS,
  PANEL_BG,
  PANEL_BORDER,
} from "../../../../lib/observe/theme";
import type { AgUIEvent } from "../../../../lib/observe/types";

const EVENT_COLORS: Record<string, string> = {
  RUN_STARTED:            "#6366F1",
  RUN_FINISHED:           "#6366F1",
  STEP_STARTED:           "#8B5CF6",
  STEP_FINISHED:          "#8B5CF6",
  TEXT_MESSAGE_START:     "#3B82F6",
  TEXT_MESSAGE_CONTENT:   "#3B82F6",
  TEXT_MESSAGE_END:       "#3B82F6",
  TOOL_CALL_START:        "#F59E0B",
  TOOL_CALL_ARGS:         "#F59E0B",
  TOOL_CALL_END:          "#F59E0B",
  TOOL_CALL_RESULT:       "#EF4444",
  STATE_SNAPSHOT:         "#10B981",
  STATE_DELTA:            "#10B981",
  MESSAGES_SNAPSHOT:      "#06B6D4",
};

const STARRED_TYPES = new Set(["STATE_SNAPSHOT", "TOOL_CALL_RESULT"]);

const FILTER_OPTIONS = [
  "All",
  "STATE_SNAPSHOT",
  "TOOL_CALL",
  "TEXT_MESSAGE",
  "A2UI",
] as const;

type FilterOption = (typeof FILTER_OPTIONS)[number];

function matchesFilter(event: AgUIEvent, filter: FilterOption): boolean {
  if (filter === "All") return true;
  if (filter === "STATE_SNAPSHOT") return event.type === "STATE_SNAPSHOT";
  if (filter === "TOOL_CALL") return String(event.type).startsWith("TOOL_CALL");
  if (filter === "TEXT_MESSAGE") return String(event.type).startsWith("TEXT_MESSAGE");
  if (filter === "A2UI") {
    // TOOL_CALL_RESULT that contains a2ui_operations
    return (
      event.type === "TOOL_CALL_RESULT" &&
      JSON.stringify(event).includes("a2ui_operations")
    );
  }
  return true;
}

function EventRow({
  event,
  index,
  scrollTarget,
}: {
  event: AgUIEvent & { _receivedAt?: number };
  index: number;
  scrollTarget: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const color = EVENT_COLORS[event.type] ?? "#6B7280";
  const starred = STARRED_TYPES.has(event.type);
  const hasA2UI = event.type === "TOOL_CALL_RESULT" && JSON.stringify(event).includes("a2ui_operations");

  useEffect(() => {
    if (scrollTarget && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [scrollTarget]);

  const ts = event._receivedAt
    ? new Date(event._receivedAt).toISOString().slice(11, 23)
    : "";

  return (
    <div ref={rowRef} style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}>
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          cursor: "pointer",
          background: expanded ? "#F0F9FF" : "transparent",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED, width: 90, flexShrink: 0 }}>
          {ts}
        </span>
        {(starred || hasA2UI) && (
          <span style={{ fontSize: "10px", color: "#F59E0B" }}>★</span>
        )}
        <span
          style={{
            fontSize: FONT_XS,
            fontWeight: 600,
            color,
            width: 200,
            flexShrink: 0,
          }}
        >
          {event.type}
        </span>
        {!expanded && (
          <span
            style={{
              fontSize: FONT_XS,
              color: COLOR_TEXT_SECONDARY,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {summarize(event)}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <div
          style={{
            background: "#1E1E2E",
            padding: "8px 12px",
            overflowX: "auto",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontSize: "11px",
              color: "#E2E8F0",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {JSON.stringify(event, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function summarize(event: AgUIEvent): string {
  if (event.type === "STATE_SNAPSHOT") {
    const snap = (event.snapshot ?? event.state ?? event) as Record<string, unknown>;
    return `status: ${(snap as Record<string, string>).status ?? JSON.stringify(snap).slice(0, 60)}`;
  }
  if (event.type === "TOOL_CALL_START" || event.type === "TOOL_CALL_END") {
    return String(event.toolCallName ?? event.tool_name ?? "");
  }
  if (event.type === "TEXT_MESSAGE_CONTENT") {
    return `"${String(event.delta ?? event.content ?? "").slice(0, 60)}"`;
  }
  if (event.type === "TOOL_CALL_RESULT") {
    const content = JSON.stringify(event.content ?? event.result ?? "").slice(0, 80);
    return content;
  }
  return "";
}

export default function AgEventLog() {
  const [collapsed, setCollapsed] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("All");
  const events = useObserveStore((s) => s.currentAgUIEvents);
  const selectedTurnDetail = useObserveStore((s) => s.selectedTurnDetail);
  const scrollToEventIndex = useObserveStore((s) => s.scrollToEventIndex);

  // Show events from selected historical turn OR live current events
  const displayEvents: (AgUIEvent & { _receivedAt?: number })[] =
    selectedTurnDetail ? selectedTurnDetail.agui_events : events;

  const filtered = displayEvents.filter((e) => matchesFilter(e, filter));

  return (
    <div
      style={{
        background: PANEL_BG,
        borderTop: `1px solid ${PANEL_BORDER}`,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: collapsed ? 36 : 220,
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
          flexShrink: 0,
          borderBottom: collapsed ? "none" : `1px solid ${PANEL_BORDER}`,
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: FONT_SM, fontWeight: 600, color: COLOR_TEXT_PRIMARY }}>
          AG-UI Event Log
        </span>
        <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
          {filtered.length} events
        </span>
        {!collapsed && (
          <div
            style={{ marginLeft: "auto", display: "flex", gap: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                style={{
                  fontSize: FONT_XS,
                  padding: "1px 6px",
                  borderRadius: 3,
                  border: `1px solid ${PANEL_BORDER}`,
                  background: filter === opt ? "#6366F1" : "white",
                  color: filter === opt ? "white" : COLOR_TEXT_SECONDARY,
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED, marginLeft: collapsed ? "auto" : 8 }}>
          {collapsed ? "▼" : "▲"}
        </span>
      </div>

      {/* Event list */}
      {!collapsed && (
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "12px 16px", fontSize: FONT_SM, color: COLOR_TEXT_MUTED }}>
              No events yet. Run a turn to see the AG-UI stream.
            </div>
          )}
          {filtered.map((event, i) => (
            <EventRow
              key={i}
              event={event}
              index={i}
              scrollTarget={scrollToEventIndex === i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
