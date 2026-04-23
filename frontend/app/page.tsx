"use client";

import { CopilotChat, useAgent, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import { useState, useRef, useEffect } from "react";
import type { AgentState } from "@/types/agent-state";
import { VizPanel } from "./components/VizPanel";

const DEFAULT_CHAT_W = 400;
const MIN_CHAT_W = 280;
const MIN_VIZ_W = 360;
const BACKEND_URL = "http://localhost:8000";

function extractContent(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c: any) => c.text ?? c.content ?? "").join("");
  return String(content);
}

function AnalyticsSection() {
  const { agent } = useAgent({ agentId: "ai_over_bi" });
  const agentState = agent.state as AgentState | null;
  const hasMessages = (agent.messages?.length ?? 0) > 0;

  const [inputMode, setInputMode]   = useState<"input" | "transcribe" | "processing">("input");
  const [inputValue, setInputValue] = useState("");
  const recognitionRef  = useRef<any>(null);
  const savedValueRef   = useRef("");

  // Resizable split
  const [chatW, setChatW] = useState(DEFAULT_CHAT_W);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const raw = e.clientX - rect.left;
      const maxChat = rect.width - MIN_VIZ_W;
      const next = Math.max(MIN_CHAT_W, Math.min(maxChat, raw));
      setChatW(next);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const userMessageCount = agent.messages?.filter((m: any) => m.role === "user").length ?? 0;
  useEffect(() => { setInputValue(""); }, [userMessageCount]);

  useEffect(() => {
    console.log("[ai_over_bi state]", agent.state);
  }, [agent.state]);

  useConfigureSuggestions({
    instructions:
      "Suggest short, actionable business questions a retail analyst would ask. " +
      "Focus on: sales performance, guest count trends, regional comparisons, period-over-period analysis, " +
      "store rankings, or industry benchmarking. Keep suggestions concise (under 12 words).",
    minSuggestions: 2,
    maxSuggestions: 3,
    available: "after-first-message",
    providerAgentId: "default",
    consumerAgentId: "ai_over_bi",
  });

  return (
    <div ref={containerRef} style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

      {/* ── Chat sidebar (left) ── */}
      <div id="chat-panel" style={{
        width: chatW,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "#FFFFFF",
      }}>
        <CopilotChat
          agentId="ai_over_bi"
          className="h-full"
          messageView={{
            assistantMessage: {
              style: { fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontSize: "12px", lineHeight: "normal" },
              toolbarVisible: true,
              onThumbsUp: () => {},
              onThumbsDown: () => {},
              onReadAloud: (msg: any) => {
                if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
                const el: HTMLElement | null = msg?.currentTarget ?? msg?.target ?? null;
                const container = el?.closest(".copilotKitAssistantMessage") ?? null;
                const text = container?.textContent?.trim() ?? "";
                if (!text) return;
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1;
                window.speechSynthesis.speak(utterance);
              },
            },
            userMessage: {
              onEditMessage: (props: any) => {
                const content = props?.message?.content;
                if (content) { setInputValue(content); return; }
                const el: HTMLElement | null = props?.currentTarget ?? props?.target ?? null;
                const container = el?.closest(".copilotKitUserMessage") ?? null;
                const text = container?.textContent?.trim() ?? "";
                if (text) setInputValue(text);
              },
            },
          }}
          input={{
            value: inputValue,
            onChange: setInputValue,
            mode: inputMode,
            onStartTranscribe: () => {
              savedValueRef.current = inputValue;
              const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
              if (!SR) return;
              const recognition = new SR();
              recognition.lang = "en-US";
              recognition.interimResults = true;
              recognition.continuous = true;
              recognition.onresult = (e: any) => {
                const transcript = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join("");
                const prefix = savedValueRef.current ? savedValueRef.current + " " : "";
                setInputValue(prefix + transcript);
              };
              recognition.start();
              recognitionRef.current = recognition;
              setInputMode("transcribe");
            },
            onCancelTranscribe: () => {
              recognitionRef.current?.abort();
              recognitionRef.current = null;
              setInputValue(savedValueRef.current);
              setInputMode("input");
            },
            onFinishTranscribe: () => {
              recognitionRef.current?.stop();
              recognitionRef.current = null;
              setInputMode("input");
            },
            onAddFile: () => alert("File attach — not yet implemented"),
            toolsMenu: [
              { label: "Clear conversation", action: () => console.log("clear triggered") },
            ],
          }}
          labels={{
            chatInputPlaceholder: hasMessages
              ? "Ask another question..."
              : "Ask about sales, guest trends, comparisons...",
            welcomeMessageText:
              "I'm your AI business analyst for QuickBite. Ask me about sales performance, guest trends, regional comparisons, or any other insights from FY2024 data.",
            chatDisclaimerText:
              "AI over BI analyzes synthetic FY2024 QuickBite store data. Results are for demonstration purposes.",
            assistantMessageToolbarCopyMessageLabel: "Copy",
            assistantMessageToolbarThumbsUpLabel: "Helpful",
            assistantMessageToolbarThumbsDownLabel: "Not helpful",
            assistantMessageToolbarReadAloudLabel: "Read aloud",
            assistantMessageToolbarCopyCodeLabel: "Copy",
            assistantMessageToolbarCopyCodeCopiedLabel: "Copied!",
            userMessageToolbarCopyMessageLabel: "Copy",
            userMessageToolbarEditMessageLabel: "Edit",
            chatInputToolbarAddButtonLabel: "Attach file",
            chatInputToolbarToolsButtonLabel: "Tools",
            chatInputToolbarStartTranscribeButtonLabel: "Speak",
            chatInputToolbarCancelTranscribeButtonLabel: "Cancel",
            chatInputToolbarFinishTranscribeButtonLabel: "Done",
          }}
        />
      </div>

      {/* ── Draggable divider ── */}
      <div
        onMouseDown={startDrag}
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        style={{
          width: 6,
          flexShrink: 0,
          cursor: "col-resize",
          background: "#E2E8F0",
          position: "relative",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#FFBC0D")}
        onMouseLeave={e => (e.currentTarget.style.background = "#E2E8F0")}
      >
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 2,
          height: 28,
          borderRadius: 1,
          background: "#94A3B8",
          pointerEvents: "none",
        }} />
      </div>

      {/* ── Visualization panel (right) ── */}
      <VizPanel
        visualizations={agentState?.visualizations ?? []}
        insight={agentState?.insight ?? null}
        status={agentState?.status ?? "idle"}
      />
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <AnalyticsSection />
    </div>
  );
}
