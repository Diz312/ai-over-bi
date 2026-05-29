"use client";
import { Handle, Position } from "@xyflow/react";
import {
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  FONT_SM,
  FONT_XS,
  NODE_BG,
  NODE_CONTEXT_ACCENT,
  NODE_CONTEXT_H,
  NODE_CONTEXT_W,
  NODE_RADIUS,
  NODE_SHADOW,
} from "../../../../lib/observe/theme";
import type { ContextSourceNodeData } from "../../../../lib/observe/types";
import { useObserveStore } from "../../../../lib/observe/store";

interface Props {
  data: ContextSourceNodeData;
  id: string;
}

const TYPE_LABEL: Record<string, string> = {
  system_prompt: "System Prompt",
  shared_rules: "Shared Rules",
  catalog: "Catalog",
};

export default function ContextSourceNode({ data, id }: Props) {
  const staticTokens = useObserveStore((s) => s.staticTokens);
  const selectedNodeId = useObserveStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useObserveStore((s) => s.setSelectedNodeId);

  const accent = NODE_CONTEXT_ACCENT[data.nodeType] ?? "#6B7280";
  const isSelected = selectedNodeId === id;
  const tokens = staticTokens?.[data.fileName as keyof typeof staticTokens] ?? data.staticTokens;

  return (
    <div
      onClick={() => setSelectedNodeId(isSelected ? null : id)}
      style={{
        width: NODE_CONTEXT_W,
        height: NODE_CONTEXT_H,
        background: NODE_BG,
        border: `2px solid ${isSelected ? accent : "#E5E7EB"}`,
        borderRadius: NODE_RADIUS,
        boxShadow: NODE_SHADOW,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "6px 10px",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accent,
            flexShrink: 0,
          }}
        />
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
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY }}>
          {TYPE_LABEL[data.nodeType]}
        </span>
        <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY }}>
          ~{tokens.toLocaleString()} tok
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: accent }} />
    </div>
  );
}
