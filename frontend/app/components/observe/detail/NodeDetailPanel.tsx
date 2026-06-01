"use client";
/**
 * NodeDetailPanel — right-side panel that slides in on node click.
 * Shows full metrics, context window breakdown, assembled prompt,
 * thinking stream, tool calls, and cache info.
 */

import { useState, useEffect } from "react";
import { useObserveStore } from "../../../../lib/observe/store";
import {
  COLOR_TEXT_MUTED,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  DETAIL_WIDTH,
  FONT_LG,
  FONT_SM,
  FONT_XL,
  FONT_XS,
  NODE_AGENT_ACCENT,
  NODE_CONTEXT_ACCENT,
  NODE_TOOL_ACCENT,
  PANEL_BG,
  PANEL_BORDER,
  formatCost,
  formatMs,
  formatTokens,
} from "../../../../lib/observe/theme";
import type { ContextSourceNodeData, Span } from "../../../../lib/observe/types";
import { INITIAL_NODES } from "../canvas/topology";
import { MODEL_CONTEXT_LIMITS } from "../../../../lib/observe/pricing";

export default function NodeDetailPanel() {
  const selectedNodeId = useObserveStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useObserveStore((s) => s.setSelectedNodeId);
  const currentSpans = useObserveStore((s) => s.currentSpans);
  const selectedTurnDetail = useObserveStore((s) => s.selectedTurnDetail);
  const staticTokens = useObserveStore((s) => s.staticTokens);
  const nodeStates = useObserveStore((s) => s.nodeStates);

  if (!selectedNodeId) return null;

  // Check if this is a context source node
  const contextNode = INITIAL_NODES.find(
    (n) => n.id === selectedNodeId && n.type === "contextSourceNode"
  );
  const contextData = contextNode?.data as ContextSourceNodeData | undefined;

  const spans = selectedTurnDetail?.spans ?? currentSpans;
  const nodeSpans = spans.filter(
    (s) => s.agent_name === selectedNodeId || s.tool_name === selectedNodeId
  );
  const llmSpan = nodeSpans.find((s) => s.type === "llm");
  const toolSpans = nodeSpans.filter((s) => s.type === "tool");
  const agentSpan = nodeSpans.find((s) => s.type === "agent");
  const runtime = nodeStates[selectedNodeId];

  const isAgent = !!agentSpan || !!llmSpan;
  const isTool = !isAgent && toolSpans.length > 0;

  return (
    <div
      style={{
        width: DETAIL_WIDTH,
        background: PANEL_BG,
        borderLeft: `1px solid ${PANEL_BORDER}`,
        overflowY: "auto",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${PANEL_BORDER}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: FONT_LG, fontWeight: 700, color: COLOR_TEXT_PRIMARY }}>
          {selectedNodeId}
        </span>
        <button
          onClick={() => setSelectedNodeId(null)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: COLOR_TEXT_SECONDARY,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Context source file viewer */}
        {contextData && <PromptFileSection fileName={contextData.fileName} nodeType={contextData.nodeType} staticTokens={staticTokens?.[contextData.fileName] ?? contextData.staticTokens} />}

        {/* Metrics */}
        {!contextData && llmSpan && <MetricsSection span={llmSpan} />}
        {!contextData && isTool && toolSpans.map((ts) => <ToolSpanSection key={ts.span_id} span={ts} />)}

        {/* Context window */}
        {!contextData && llmSpan && <ContextWindowSection span={llmSpan} staticTokens={staticTokens} nodeId={selectedNodeId} />}

        {/* Cache */}
        {!contextData && llmSpan && llmSpan.tokens_cached > 0 && <CacheSection span={llmSpan} />}

        {/* Thinking */}
        {!contextData && llmSpan?.thinking_text && <ThinkingStream text={llmSpan.thinking_text} />}

        {/* Assembled prompt */}
        {!contextData && llmSpan?.assembled_prompt && <AssembledPromptSection prompt={llmSpan.assembled_prompt} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PromptFileSection — shown when a context source node is selected
// ---------------------------------------------------------------------------

const BACKEND = "http://localhost:8000";

const TYPE_LABEL: Record<string, string> = {
  system_prompt: "System Prompt",
  shared_rules: "Shared Rules",
  catalog: "Catalog",
};

function PromptFileSection({
  fileName,
  nodeType,
  staticTokens,
}: {
  fileName: string;
  nodeType: string;
  staticTokens: number;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setContent(null);
    setLoading(true);
    fetch(`${BACKEND}/observe/prompt_file/${encodeURIComponent(fileName)}`)
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? ""))
      .catch(() => setContent("(failed to load)"))
      .finally(() => setLoading(false));
  }, [fileName]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* File meta */}
      <Section title="File Info">
        <MetricRow label="Name" value={fileName} />
        <MetricRow label="Type" value={TYPE_LABEL[nodeType] ?? nodeType} />
        <MetricRow label="Est. tokens" value={`~${staticTokens.toLocaleString()}`} />
      </Section>

      {/* File content */}
      <Section
        title={`Content${content ? ` (${content.length.toLocaleString()} chars)` : ""}`}
        collapsible
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      >
        {!collapsed && (
          loading ? (
            <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>Loading...</span>
          ) : (
            <pre
              style={{
                margin: 0,
                fontSize: "10px",
                color: "#374151",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#F9FAFB",
                padding: 8,
                borderRadius: 4,
                maxHeight: 420,
                overflowY: "auto",
                lineHeight: 1.5,
              }}
            >
              {content ?? ""}
            </pre>
          )
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricsSection
// ---------------------------------------------------------------------------

function MetricsSection({ span }: { span: Span }) {
  return (
    <Section title="Metrics">
      <MetricRow label="Model" value={span.model ?? "—"} />
      <MetricRow label="Tokens in" value={formatTokens(span.tokens_in)} />
      <MetricRow label="Tokens out" value={formatTokens(span.tokens_out)} />
      {span.tokens_cached > 0 && (
        <MetricRow label="Tokens cached" value={formatTokens(span.tokens_cached)} highlight />
      )}
      {span.tokens_thinking > 0 && (
        <MetricRow label="Thinking tokens" value={formatTokens(span.tokens_thinking)} />
      )}
      {span.elapsed_ms != null && (
        <MetricRow label="Elapsed" value={formatMs(span.elapsed_ms)} />
      )}
      <MetricRow label="Cost" value={formatCost(span.cost_usd)} />
      {span.error && (
        <MetricRow label="Error" value={span.error} danger />
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// ContextWindowSection
// ---------------------------------------------------------------------------

function ContextWindowSection({
  span,
  staticTokens,
  nodeId,
}: {
  span: Span;
  staticTokens: Record<string, number> | null;
  nodeId: string;
}) {
  if (!span.tokens_in) return null;

  const limit = MODEL_CONTEXT_LIMITS[span.model ?? ""] ?? 200_000;
  const utilPct = span.context_utilization_pct ?? (span.tokens_in / limit * 100);

  // Compute static system prompt tokens for this agent
  const agentPromptFiles: Record<string, string[]> = {
    ai_over_bi: ["orchestrator.md"],
    data_query_agent: ["data_query.md", "_metric_display_rules.md", "viz_catalog"],
    analyst_agent: ["analyst.md", "_metric_display_rules.md", "viz_catalog"],
  };

  const files = agentPromptFiles[nodeId] ?? [];
  const staticTotal = files.reduce((acc, f) => acc + (staticTokens?.[f as keyof typeof staticTokens] ?? 0), 0);
  const dynamicTokens = Math.max(0, span.tokens_in - staticTotal);

  const barWidth = 220;

  return (
    <Section title="Context Window">
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY }}>
            {span.tokens_in.toLocaleString()} / {limit.toLocaleString()} tokens
          </span>
          <span
            style={{
              fontSize: FONT_XS,
              fontWeight: 600,
              color: utilPct > 90 ? "#EF4444" : utilPct > 70 ? "#F59E0B" : "#22C55E",
            }}
          >
            {utilPct.toFixed(1)}%
          </span>
        </div>
        {/* Utilization bar */}
        <div style={{ width: "100%", height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(100, utilPct)}%`,
              height: "100%",
              background: utilPct > 90 ? "#EF4444" : utilPct > 70 ? "#F59E0B" : "#22C55E",
              borderRadius: 3,
            }}
          />
        </div>
      </div>

      {/* Stacked breakdown */}
      {staticTotal > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY, marginBottom: 4, display: "block" }}>
            Breakdown
          </span>
          <StackedBar
            segments={[
              { label: "System Prompt", value: staticTotal, color: "#6366F1" },
              { label: "History / Tools", value: dynamicTokens, color: "#06B6D4" },
            ]}
            total={span.tokens_in}
          />
        </div>
      )}
    </Section>
  );
}

function StackedBar({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", width: "100%" }}>
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{
              width: `${(seg.value / total) * 100}%`,
              background: seg.color,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY, display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, display: "inline-block" }} />
              {seg.label}
            </span>
            <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_PRIMARY, fontWeight: 600 }}>
              {formatTokens(seg.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CacheSection
// ---------------------------------------------------------------------------

function CacheSection({ span }: { span: Span }) {
  const savings = span.tokens_cached * 3.0 * 0.9 / 1_000_000; // approximate savings
  return (
    <Section title="Cache">
      <MetricRow label="Cached tokens" value={formatTokens(span.tokens_cached)} highlight />
      <MetricRow label="Cache hit rate" value={`${((span.tokens_cached / Math.max(1, span.tokens_in)) * 100).toFixed(1)}%`} highlight />
      <MetricRow label="Est. savings" value={formatCost(savings)} highlight />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// ThinkingStream
// ---------------------------------------------------------------------------

function ThinkingStream({ text }: { text: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Section
      title="Thinking"
      collapsible
      collapsed={collapsed}
      onToggle={() => setCollapsed((v) => !v)}
    >
      {!collapsed && (
        <pre
          style={{
            margin: 0,
            fontSize: FONT_XS,
            color: "#4B5563",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#F0F4FF",
            padding: 8,
            borderRadius: 4,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {text}
        </pre>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// AssembledPromptSection
// ---------------------------------------------------------------------------

function AssembledPromptSection({ prompt }: { prompt: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const charCount = prompt.length;
  return (
    <Section
      title={`Assembled Prompt (${charCount.toLocaleString()} chars)`}
      collapsible
      collapsed={collapsed}
      onToggle={() => setCollapsed((v) => !v)}
    >
      {!collapsed && (
        <pre
          style={{
            margin: 0,
            fontSize: "10px",
            color: "#374151",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#F9FAFB",
            padding: 8,
            borderRadius: 4,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {prompt}
        </pre>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// ToolSpanSection
// ---------------------------------------------------------------------------

function ToolSpanSection({ span }: { span: Span }) {
  const [argsCollapsed, setArgsCollapsed] = useState(false);
  const [resultCollapsed, setResultCollapsed] = useState(false);

  return (
    <Section title={`Tool: ${span.tool_name}`}>
      {span.elapsed_ms != null && (
        <MetricRow label="Elapsed" value={formatMs(span.elapsed_ms)} />
      )}
      {span.error && <MetricRow label="Error" value={span.error} danger />}

      {span.tool_args && (
        <div style={{ marginTop: 6 }}>
          <div
            onClick={() => setArgsCollapsed((v) => !v)}
            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", marginBottom: 3 }}
          >
            <span style={{ fontSize: FONT_XS, fontWeight: 600, color: COLOR_TEXT_SECONDARY }}>
              Arguments
            </span>
            <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
              {argsCollapsed ? "▼" : "▲"}
            </span>
          </div>
          {!argsCollapsed && (
            <pre
              style={{
                margin: 0,
                fontSize: "10px",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#FFFBEB",
                padding: 6,
                borderRadius: 4,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {JSON.stringify(span.tool_args, null, 2)}
            </pre>
          )}
        </div>
      )}

      {span.tool_result != null && (
        <div style={{ marginTop: 6 }}>
          <div
            onClick={() => setResultCollapsed((v) => !v)}
            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", marginBottom: 3 }}
          >
            <span style={{ fontSize: FONT_XS, fontWeight: 600, color: COLOR_TEXT_SECONDARY }}>
              Result
            </span>
            <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
              {resultCollapsed ? "▼" : "▲"}
            </span>
          </div>
          {!resultCollapsed && (
            <pre
              style={{
                margin: 0,
                fontSize: "10px",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#F0FFF4",
                padding: 6,
                borderRadius: 4,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {JSON.stringify(span.tool_result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
  collapsible,
  collapsed,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div>
      <div
        onClick={collapsible ? onToggle : undefined}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          cursor: collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: FONT_XS,
            fontWeight: 700,
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </span>
        {collapsible && (
          <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
            {collapsed ? "▼" : "▲"}
          </span>
        )}
      </div>
      {children}
      <div style={{ height: 1, background: PANEL_BORDER, marginTop: 10 }} />
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
      <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY }}>{label}</span>
      <span
        style={{
          fontSize: FONT_XS,
          fontWeight: 600,
          color: danger ? "#EF4444" : highlight ? "#10B981" : COLOR_TEXT_PRIMARY,
        }}
      >
        {value}
      </span>
    </div>
  );
}
