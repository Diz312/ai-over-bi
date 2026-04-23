"use client";

import type { VizPayload } from "@/types/viz";
import type { Status } from "@/types/agent-state";
import { VizRenderer } from "./VizRenderer";

interface VizPanelProps {
  visualizations: VizPayload[];
  insight: string | null;
  status: Status;
}

export function VizPanel({ visualizations, insight, status }: VizPanelProps) {
  const isLoading = status === "querying" || status === "analyzing" || status === "thinking";
  const hasViz    = visualizations.length > 0;

  if (!hasViz && !isLoading) {
    return <EmptyState />;
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minHeight: 0,
      background: "#F5F5F5",
    }}>
      {/* Status banner */}
      {isLoading && <StatusBanner status={status} />}

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", paddingBottom: 40 }}>

        {/* Analyst insight */}
        {insight && (
          <div style={{
            background: "#FFF8E7",
            border: "1px solid #FFE082",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "#FFBC0D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 1,
            }}>
              <AnalystIcon />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7A5200", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                Analyst Insight
              </div>
              <p style={{ fontSize: 13, color: "#3D2B00", lineHeight: 1.65, margin: 0 }}>{insight}</p>
            </div>
          </div>
        )}

        {hasViz && <VizRenderer visualizations={visualizations} />}
      </div>
    </div>
  );
}

function StatusBanner({ status }: { status: Status }) {
  const labels: Record<string, string> = {
    thinking:  "Understanding your question...",
    querying:  "Querying store data...",
    analyzing: "Analyzing performance & benchmarking against industry...",
  };
  return (
    <div style={{
      background: "#27251F",
      padding: "8px 24px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexShrink: 0,
    }}>
      <Spinner />
      <span style={{ fontSize: 12, color: "#A0A0A0", fontWeight: 500 }}>
        {labels[status] ?? "Working..."}
      </span>
    </div>
  );
}

function EmptyState() {
  const examples = [
    "Show me Q3 sales by region",
    "Compare Q3 vs Q2 performance",
    "Which stores have the highest guest counts?",
    "How did net sales trend across 2024?",
    "Explain the performance gap between Northeast and Southwest",
  ];
  return (
    <div style={{
      flex: 1,
      background: "#F5F5F5",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      gap: 24,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "#FFBC0D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <ChartIcon />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#27251F", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Ask a business question
        </div>
        <div style={{ fontSize: 13, color: "#64748B", maxWidth: 340, lineHeight: 1.6 }}>
          Your AI analyst will query the data, compare periods, and build the right visualizations automatically.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 380 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#6B6B6B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Try asking
        </div>
        {examples.map((ex, i) => (
          <div key={i} style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            color: "#27251F",
            cursor: "default",
          }}>
            {ex}
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 1s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="#4A4338" strokeWidth="2" />
      <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="#FFBC0D" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AnalystIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="5" r="2.5" stroke="white" strokeWidth="1.5" />
      <path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="4" y="16" width="4" height="8" rx="1" fill="white" opacity="0.6" />
      <rect x="10" y="10" width="4" height="14" rx="1" fill="white" opacity="0.8" />
      <rect x="16" y="6" width="4" height="18" rx="1" fill="white" />
      <rect x="22" y="12" width="4" height="12" rx="1" fill="white" opacity="0.7" />
    </svg>
  );
}
