"use client";

import { useEffect, useMemo, useReducer } from "react";
import {
  CopilotChatMessageView,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";

/**
 * ChatTranscript — scrollable message transcript.
 *
 * Uses `CopilotChatMessageView` (not the composite `CopilotChat`) so the
 * input lives in a separate region above. Subscribes to agent updates so new
 * messages and run-state changes trigger re-render. Connects the agent on
 * mount once so the first send doesn't race the backend handshake.
 *
 * A2UI surfaces render inline as activity messages — the renderer is wired
 * via the `<CopilotKit a2ui={{ catalog: biCatalog }}>` prop in page.tsx.
 */

const AGENT_ID = "ai_over_bi";

export function ChatTranscript() {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const { copilotkit } = useCopilotKit();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  // Subscribe to agent state changes so messages/run-state drive re-render.
  useEffect(() => {
    const subscription = agent.subscribe({
      onMessagesChanged: forceUpdate,
      onRunInitialized: forceUpdate,
      onRunFinalized: forceUpdate,
      onRunFailed: forceUpdate,
    });
    return () => subscription.unsubscribe();
  }, [agent]);

  // Connect once on mount so the backend session is live before the first send.
  useEffect(() => {
    const ac = new AbortController();
    if ("abortController" in agent) {
      (agent as unknown as { abortController: AbortController }).abortController = ac;
    }
    copilotkit.connectAgent({ agent }).catch(() => {
      // connectAgent emits errors via the subscriber system; swallow here so
      // unmount-time aborts in StrictMode don't surface as unhandled rejections.
    });
    return () => {
      ac.abort();
      void agent.detachActiveRun().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  const messages = useMemo(() => agent.messages ?? [], [agent.messages]);
  const isRunning = (agent as unknown as { isRunning?: boolean }).isRunning ?? false;

  return (
    <section
      data-region="chat-transcript"
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "auto",
        background: "#F7F7F7",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "16px" }}>
        <CopilotChatMessageView
          messages={messages}
          isRunning={isRunning}
        />
      </div>
    </section>
  );
}
