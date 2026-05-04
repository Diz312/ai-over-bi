"use client";

import { useMemo } from "react";
import {
  CopilotKit,
  CopilotChatConfigurationProvider,
} from "@copilotkit/react-core/v2";
import { biCatalog } from "@/lib/a2ui/catalog";
import { NavBar } from "./components/shell/NavBar";
import { ChatInputRow } from "./components/shell/ChatInputRow";
import { ChatTranscript } from "./components/shell/ChatTranscript";

/**
 * Three-region vertical shell:
 *   ┌─────────────────────────── NavBar ──────────────────────────┐
 *   ├──────────────────────── ChatInputRow ───────────────────────┤
 *   └──────────────────────── ChatTranscript ─────────────────────┘
 *
 * The chat is split (input above, transcript below) per the requested
 * layout, so we use the lower-level `CopilotChatInput` + `CopilotChatMessageView`
 * primitives instead of the bundled `<CopilotChat />`. Each region is a
 * standalone component for easy Figma-driven restyling.
 */

const AGENT_ID = "ai_over_bi";

export default function Home() {
  // Stable threadId for this session so transcript state persists across
  // re-renders and the chat configuration provider doesn't churn.
  const threadId = useMemo(() => crypto.randomUUID(), []);

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      enableInspector={true}
      agent={AGENT_ID}
      a2ui={{ catalog: biCatalog }}
    >
      <CopilotChatConfigurationProvider agentId={AGENT_ID} threadId={threadId}>
        <div
          style={{
            height: "100vh",
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <NavBar />
          <ChatInputRow />
          <ChatTranscript />
        </div>
      </CopilotChatConfigurationProvider>
    </CopilotKit>
  );
}
