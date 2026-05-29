"use client";
import { Handle, Position } from "@xyflow/react";
import {
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  FONT_SM,
  FONT_XS,
  NODE_BG,
  NODE_RADIUS,
  NODE_SHADOW,
  NODE_TOOL_ACCENT,
  NODE_TOOL_H,
  NODE_TOOL_W,
  STATUS_RING_WIDTH,
  formatMs,
  statusColor,
} from "../../../../lib/observe/theme";
import type { ToolNodeData } from "../../../../lib/observe/types";
import { useObserveStore } from "../../../../lib/observe/store";

interface Props {
  data: ToolNodeData;
  id: string;
}

export default function ToolNode({ data, id }: Props) {
  const nodeStates = useObserveStore((s) => s.nodeStates);
  const selectedNodeId = useObserveStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useObserveStore((s) => s.setSelectedNodeId);

  const runtime = nodeStates[id];
  const status = runtime?.status ?? data.status;
  const ring = statusColor(status);
  const isSelected = selectedNodeId === id;

  return (
    <div
      onClick={() => setSelectedNodeId(isSelected ? null : id)}
      style={{
        width: NODE_TOOL_W,
        height: NODE_TOOL_H,
        background: NODE_BG,
        border: `${STATUS_RING_WIDTH}px solid ${ring}`,
        borderRadius: NODE_RADIUS,
        boxShadow: isSelected ? `0 0 0 2px ${NODE_TOOL_ACCENT}` : NODE_SHADOW,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "6px 10px",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: FONT_SM,
            fontWeight: 600,
            color: COLOR_TEXT_PRIMARY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.label}
        </span>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: ring,
            flexShrink: 0,
          }}
        />
      </div>

      {runtime?.elapsedMs !== undefined && (
        <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY, marginTop: 2 }}>
          {formatMs(runtime.elapsedMs)}
          {runtime.error && (
            <span style={{ color: "#EF4444", marginLeft: 4 }}>error</span>
          )}
        </span>
      )}

      <Handle type="target" position={Position.Top} style={{ background: NODE_TOOL_ACCENT }} />
    </div>
  );
}
