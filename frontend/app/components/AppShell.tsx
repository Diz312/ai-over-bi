"use client";

import { CopilotKit } from "@copilotkit/react-core";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{
        height: 56,
        flexShrink: 0,
        background: "#27251F",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 14,
        position: "relative",
        zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 24, background: "#FFBC0D", borderRadius: 2 }} />
          <span style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
          }}>
            AI<span style={{ color: "#FFBC0D" }}>over</span>BI
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#6B6B6B",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginLeft: 4,
            marginTop: 2,
          }}>
            QuickBite Analytics
          </span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <StatusPill label="FY 2024" />
          <StatusPill label="100 Stores" />
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}>
        <CopilotKit runtimeUrl="/api/copilotkit" agent="ai_over_bi" showDevConsole={false}>
          {children}
        </CopilotKit>
      </main>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      color: "#9E8A6E",
      background: "#37332A",
      border: "1px solid #4A4338",
      borderRadius: 4,
      padding: "2px 8px",
      letterSpacing: "0.05em",
    }}>
      {label}
    </span>
  );
}
