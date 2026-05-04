"use client";

import { CopilotChatInput, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";

/**
 * ChatInputRow — user input field, positioned below the navbar and above the
 * transcript. Renders the Figma gold-background group (Group 90149) as the
 * visual wrapper: a full-width McDonald's gold band with a wavy drip bottom
 * edge that visually bleeds 20px over the transcript region below.
 *
 * Layout notes:
 *  - The background image is absolutely positioned inside the section and
 *    extends 20px below the section bounds (the drip). The outer shell div
 *    in page.tsx has no overflow:hidden so the drip is visible.
 *  - The input content sits at zIndex:1 above the background (zIndex:0).
 *  - The section itself is zIndex:1 in the page stacking context so it
 *    paints above the static ChatTranscript section below.
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
        position: "relative",
        zIndex: 1,
        boxSizing: "border-box",
      }}
    >
      {/* Gold background + wavy drip — extends 20px below section into transcript */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: -20,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <img
          alt=""
          src="/icons/chat-input-bg.svg"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "fill",
          }}
        />
      </div>

      {/* Input content — floats above the background */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 880,
          margin: "0 auto",
          padding: "12px 16px",
        }}
      >
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
