"use client";

import { CopilotKit, CopilotChat } from "@copilotkit/react-core/v2";
import { biCatalog } from "@/lib/a2ui/catalog";

export default function Home() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      enableInspector={true}
      agent="ai_over_bi"
      a2ui={{ catalog: biCatalog }}
    >
      <div style={{ height: "100vh" }}>
        <CopilotChat agentId="ai_over_bi" className="h-full" />
      </div>
    </CopilotKit>
  );
}
