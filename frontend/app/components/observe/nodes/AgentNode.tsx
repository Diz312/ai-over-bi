"use client";
import { Handle, Position } from "@xyflow/react";
import {
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  FONT_SM,
  FONT_XS,
  NODE_AGENT_ACCENT,
  NODE_AGENT_H,
  NODE_AGENT_W,
  NODE_BG,
  NODE_RADIUS,
  NODE_SHADOW,
  STATUS_RING_WIDTH,
  formatCost,
  formatMs,
  formatTokens,
  statusColor,
} from "../../../../lib/observe/theme";
import type { AgentNodeData } from "../../../../lib/observe/types";
import { useObserveStore } from "../../../../lib/observe/store";

interface Props {
  data: AgentNodeData;
  id: string;
}

const STATUS_LABEL: Record<string, string> = {
  idle:    "idle",
  running: "running...",
  done:    "done",
  error:   "error",
};

export default function AgentNode({ data, id }: Props) {
  const nodeStates = useObserveStore((s) => s.nodeStates);
  const selectedNodeId = useObserveStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useObserveStore((s) => s.setSelectedNodeId);

  const runtime = nodeStates[id];
  const status = runtime?.status ?? data.status;
  const ring = statusColor(status);
  const isSelected = selectedNodeId === id;

  const tokensIn = runtime?.tokensIn;
  const tokensOut = runtime?.tokensOut;
  const costUsd = runtime?.costUsd;
  const elapsedMs = runtime?.elapsedMs;
  const ctxPct = runtime?.contextUtilizationPct;

  return (
    <div
      onClick={() => setSelectedNodeId(isSelected ? null : id)}
      style={{
        width: NODE_AGENT_W,
        height: NODE_AGENT_H,
        background: NODE_BG,
        border: `${STATUS_RING_WIDTH}px solid ${ring}`,
        borderRadius: NODE_RADIUS,
        boxShadow: isSelected ? `0 0 0 2px ${NODE_AGENT_ACCENT}` : NODE_SHADOW,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "8px 12px",
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Agent label + status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: FONT_SM, fontWeight: 700, color: COLOR_TEXT_PRIMARY }}>
          {data.label}
        </span>
        <span
          style={{
            fontSize: FONT_XS,
            color: ring,
            fontWeight: 600,
          }}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Model */}
      <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY, marginTop: 2 }}>
        {data.model}
      </span>

      {/* Metrics row — shown when done */}
      {(tokensIn !== undefined || costUsd !== undefined) && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 5,
            flexWrap: "wrap",
          }}
        >
          {tokensIn !== undefined && (
            <Metric label="in" value={formatTokens(tokensIn)} />
          )}
          {tokensOut !== undefined && (
            <Metric label="out" value={formatTokens(tokensOut)} />
          )}
          {elapsedMs !== undefined && (
            <Metric label="time" value={formatMs(elapsedMs)} />
          )}
          {costUsd !== undefined && (
            <Metric label="cost" value={formatCost(costUsd)} />
          )}
          {ctxPct !== undefined && (
            <Metric
              label="ctx"
              value={`${ctxPct}%`}
              warn={ctxPct > 70}
              danger={ctxPct > 90}
            />
          )}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={{ background: NODE_AGENT_ACCENT }} />
      <Handle type="source" position={Position.Bottom} style={{ background: NODE_AGENT_ACCENT }} />
    </div>
  );
}

function Metric({
  label,
  value,
  warn,
  danger,
}: {
  label: string;
  value: string;
  warn?: boolean;
  danger?: boolean;
}) {
  const color = danger ? "#EF4444" : warn ? "#F59E0B" : COLOR_TEXT_SECONDARY;
  return (
    <span style={{ fontSize: FONT_XS, color }}>
      <span style={{ opacity: 0.7 }}>{label}: </span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </span>
  );
}
