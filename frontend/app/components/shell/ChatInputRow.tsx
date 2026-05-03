"use client";

import { CopilotChatInput, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";

/**
 * ChatInputRow — the user input field, positioned BELOW the navbar and ABOVE
 * the transcript (per the requested layout, input sits above messages).
 *
 * Owns the send/stop wiring against the AG-UI agent. Uses `useAgent` to grab
 * the agent instance and `useCopilotKit` to drive the run lifecycle (the
 * recommended path — it executes frontend tools and chains follow-ups, while
 * `agent.runAgent()` does not).
 */

const AGENT_ID = "ai_over_bi";

export function ChatInputRow() {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const { copilotkit } = useCopilotKit();
  const isRunning = (agent as unknown as { isRunning?: boolean }).isRunning ?? false;

  const handleSubmit = (text: string) => {
    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    });
    void copilotkit.runAgent({ agent });
  };

  const handleStop = () => {
    void copilotkit.stopAgent({ agent });
  };

  return (
    <section
      data-region="chat-input"
      style={{
        flexShrink: 0,
        width: "100%",
        padding: "12px 16px",
        borderBottom: "1px solid #E5E5E5",
        background: "#FFFFFF",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <CopilotChatInput
          onSubmitMessage={handleSubmit}
          onStop={handleStop}
          isRunning={isRunning}
          autoFocus
        />
      </div>
    </section>
  );
}
