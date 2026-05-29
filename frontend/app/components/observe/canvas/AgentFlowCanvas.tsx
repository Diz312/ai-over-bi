"use client";
/**
 * AgentFlowCanvas — React Flow canvas with static agent topology.
 * Node statuses and edge animations are driven by the Zustand store
 * which is fed by useTurnStream SSE events.
 */

import { useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useObserveStore } from "../../../../lib/observe/store";
import {
  EDGE_ACTIVE_COLOR,
  EDGE_INACTIVE_COLOR,
  EDGE_STATIC_COLOR,
  EDGE_STROKE_WIDTH,
  CANVAS_BG,
} from "../../../../lib/observe/theme";
import AgentNode from "../nodes/AgentNode";
import ToolNode from "../nodes/ToolNode";
import ContextSourceNode from "../nodes/ContextSourceNode";
import {
  AGENT_EDGE_IDS,
  INITIAL_EDGES,
  INITIAL_NODES,
  TOOL_EDGE_IDS,
} from "./topology";

const NODE_TYPES = {
  agentNode: AgentNode,
  toolNode: ToolNode,
  contextSourceNode: ContextSourceNode,
};

export default function AgentFlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  const nodeStates = useObserveStore((s) => s.nodeStates);
  const staticTokens = useObserveStore((s) => s.staticTokens);

  // Update context source node token counts when static tokens load
  useEffect(() => {
    if (!staticTokens) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type !== "contextSourceNode") return n;
        const data = n.data as { fileName: string; staticTokens: number };
        const tokens = staticTokens[data.fileName as keyof typeof staticTokens] ?? 0;
        if (tokens === data.staticTokens) return n;
        return { ...n, data: { ...n.data, staticTokens: tokens } };
      })
    );
  }, [staticTokens]);

  // Animate edges based on which agents/tools are running or done
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        // Static edges (context → agent) are never animated
        if (!edge.data || edge.data.type === "static") {
          return { ...edge, style: { stroke: EDGE_STATIC_COLOR, strokeWidth: EDGE_STROKE_WIDTH }, animated: false };
        }

        if (edge.data.type === "agent") {
          // agent → agent edges: activate if target agent was invoked
          const targetState = nodeStates[edge.target];
          const active = targetState && targetState.status !== "idle";
          return {
            ...edge,
            animated: targetState?.status === "running",
            style: {
              stroke: active ? EDGE_ACTIVE_COLOR : EDGE_INACTIVE_COLOR,
              strokeWidth: EDGE_STROKE_WIDTH,
            },
          };
        }

        if (edge.data.type === "tool") {
          // agent → tool edges: activate if tool was invoked
          const toolState = nodeStates[edge.target];
          const active = toolState && toolState.status !== "idle";
          return {
            ...edge,
            animated: toolState?.status === "running",
            style: {
              stroke: active ? EDGE_ACTIVE_COLOR : EDGE_INACTIVE_COLOR,
              strokeWidth: EDGE_STROKE_WIDTH,
            },
          };
        }

        return edge;
      })
    );
  }, [nodeStates]);

  return (
    <div style={{ width: "100%", height: "100%", background: CANVAS_BG }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="#E5E7EB" />
        <Controls position="bottom-right" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "agentNode") return "#6366F1";
            if (n.type === "toolNode") return "#F59E0B";
            return "#9CA3AF";
          }}
          style={{ background: "#F9FAFB" }}
        />
      </ReactFlow>
    </div>
  );
}
