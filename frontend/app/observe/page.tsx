"use client";
/**
 * /observe — Agent observability plane.
 *
 * Layout:
 *   [TurnHistorySidebar] [canvas + summary + waterfall + eventlog] [NodeDetailPanel]
 *   [ObserveInputBar]  (full width, bottom)
 */

import { useTurnStream } from "../../lib/observe/hooks/useTurnStream";
import { useTurnHistory } from "../../lib/observe/hooks/useTurnHistory";
import AgentFlowCanvas from "../components/observe/canvas/AgentFlowCanvas";
import TurnHistorySidebar from "../components/observe/sidebar/TurnHistorySidebar";
import NodeDetailPanel from "../components/observe/detail/NodeDetailPanel";
import TurnSummaryBar from "../components/observe/summary/TurnSummaryBar";
import LatencyWaterfall from "../components/observe/waterfall/LatencyWaterfall";
import AgEventLog from "../components/observe/eventlog/AgEventLog";
import ObserveInputBar from "../components/observe/input/ObserveInputBar";
import { useObserveStore } from "../../lib/observe/store";

export default function ObservePage() {
  // Mount SSE stream and turn history loader
  useTurnStream();
  useTurnHistory();

  const handleReplay = (question: string) => {
    // Pre-fill input bar with replayed question — handled via store
    useObserveStore.getState().setIsRunning(false);
    // Trigger the input bar to auto-run this question
    // We use a simple event dispatch approach
    const event = new CustomEvent("observe:replay", { detail: { question } });
    window.dispatchEvent(event);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Main content area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Turn history */}
        <TurnHistorySidebar onReplay={handleReplay} />

        {/* Center: Canvas + panels */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TurnSummaryBar />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <AgentFlowCanvas />
          </div>
          <LatencyWaterfall />
          <AgEventLog />
        </div>

        {/* Right: Node detail */}
        <NodeDetailPanel />
      </div>

      {/* Bottom: Input bar */}
      <ObserveInputBar />
    </div>
  );
}
