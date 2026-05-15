"use client";
// @page: AP  (route: /agent)

import { useMemo } from "react";
import {
  CopilotKit,
  CopilotChatConfigurationProvider,
} from "@copilotkit/react-core/v2";
import { biCatalog } from "@/lib/a2ui/catalog";
import { NavBar } from "../components/shell/NavBar";
import { ChatInputRow } from "../components/shell/ChatInputRow";
import { ChatTranscript } from "../components/shell/ChatTranscript";

const AGENT_ID = "ai_over_bi";

export default function AgentPage() {
  const threadId = useMemo(() => crypto.randomUUID(), []);

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      enableInspector={false}
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
