"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  CopilotChatMessageView,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import {
  BRAND_WHITE,
  SECONDARY_IVORY,
  SECONDARY_LIGHT_GREY,
  SECONDARY_DARK_GREY,
} from "@/lib/theme";

const AGENT_ID = "ai_over_bi";
const DEFAULT_LEFT_PCT = 42;
const MIN_LEFT_PCT = 20;
const MAX_LEFT_PCT = 80;

export function ChatTranscript() {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const { copilotkit } = useCopilotKit();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const subscription = agent.subscribe({
      onMessagesChanged: forceUpdate,
      onRunInitialized: forceUpdate,
      onRunFinalized: forceUpdate,
      onRunFailed: forceUpdate,
    });
    return () => subscription.unsubscribe();
  }, [agent]);

  useEffect(() => {
    const ac = new AbortController();
    if ("abortController" in agent) {
      (agent as unknown as { abortController: AbortController }).abortController = ac;
    }
    copilotkit.connectAgent({ agent }).catch(() => {});
    return () => {
      ac.abort();
      void agent.detachActiveRun().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  const messages = useMemo(() => agent.messages ?? [], [agent.messages]);
  const isRunning = (agent as unknown as { isRunning?: boolean }).isRunning ?? false;

  // Split by role: "activity" messages are A2UI viz surfaces
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textMessages = useMemo(() => messages.filter((m: any) => m.role !== "activity"), [messages]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vizMessages = useMemo(() => messages.filter((m: any) => m.role === "activity"), [messages]);

  // ── Draggable divider ─────────────────────────────────────────────────────
  const [leftPct, setLeftPct] = useState(DEFAULT_LEFT_PCT);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartPct = useRef(DEFAULT_LEFT_PCT);

  const onDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStartX.current = e.clientX;
      dragStartPct.current = leftPct;
    },
    [leftPct],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const dx = e.clientX - dragStartX.current;
      const deltaPct = (dx / containerWidth) * 100;
      const clamped = Math.min(
        MAX_LEFT_PCT,
        Math.max(MIN_LEFT_PCT, dragStartPct.current + deltaPct),
      );
      setLeftPct(clamped);
    };
    const onMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  // Auto-scroll viz pane to bottom when a new visualization arrives
  const vizPaneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (vizPaneRef.current) {
      vizPaneRef.current.scrollTop = vizPaneRef.current.scrollHeight;
    }
  }, [vizMessages.length]);

  return (
    <div
      ref={containerRef}
      data-region="chat-transcript"
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        boxSizing: "border-box",
        cursor: dragging ? "col-resize" : undefined,
        userSelect: dragging ? "none" : undefined,
      }}
    >
      {/* Left pane — text messages */}
      <div
        style={{
          width: `${leftPct}%`,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          background: BRAND_WHITE,
          pointerEvents: dragging ? "none" : undefined,
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px", width: "100%" }}>
          <CopilotChatMessageView messages={textMessages} isRunning={isRunning} />
        </div>
      </div>

      {/* Draggable divider */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onMouseDown={onDividerMouseDown}
        style={{
          width: 6,
          flexShrink: 0,
          cursor: "col-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: SECONDARY_LIGHT_GREY,
        }}
      >
        <div
          style={{
            width: 2,
            height: 32,
            borderRadius: 2,
            background: SECONDARY_DARK_GREY,
            opacity: 0.35,
          }}
        />
      </div>

      {/* Right pane — visualizations */}
      <div
        ref={vizPaneRef}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          background: SECONDARY_IVORY,
          pointerEvents: dragging ? "none" : undefined,
        }}
      >
        {vizMessages.length > 0 && (
          <div style={{ padding: "16px", width: "100%" }}>
            <CopilotChatMessageView messages={vizMessages} isRunning={false} />
          </div>
        )}
      </div>
    </div>
  );
}
