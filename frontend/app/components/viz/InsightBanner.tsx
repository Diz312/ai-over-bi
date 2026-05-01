"use client";

import { useState } from "react";

interface InsightBannerProps {
  text: string;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
    >
      <path d="M8 10L12 14L16 10" stroke="#292929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThumbSVG({ flipped, color }: { flipped: boolean; color: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: flipped ? "rotate(180deg)" : "none" }}
    >
      <path
        d="M7 22V11M2 13v7a2 2 0 002 2h11.172a2 2 0 001.964-1.636l1.447-8A2 2 0 0016.62 10H13V5a2 2 0 00-2-2 1 1 0 00-1 1v1L8 9H7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeedbackButton({
  type,
  active,
  onClick,
}: {
  type: "up" | "down";
  active: boolean;
  onClick: () => void;
}) {
  const activeColor = type === "up" ? "#1F6437" : "#DA291C";
  const borderColor = active ? activeColor : "#ADADAD";
  return (
    <button
      onClick={onClick}
      aria-label={type === "up" ? "Thumbs up" : "Thumbs down"}
      aria-pressed={active}
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: `1px solid ${borderColor}`,
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "border-color 0.15s",
      }}
    >
      <ThumbSVG flipped={type === "down"} color={active ? activeColor : "#ADADAD"} />
    </button>
  );
}

type FeedbackState = "up" | "down" | null;

export function InsightBanner({ text }: InsightBannerProps) {
  const [open, setOpen] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div style={{
      background: "#F9F9F9",
      borderRadius: 4,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {/* Header row — title + collapse toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <p style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#292929",
          lineHeight: "16px",
          letterSpacing: "-0.15px",
          margin: 0,
          flex: 1,
          minWidth: 0,
        }}>
          Key Headlines
        </p>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse" : "Expand"}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
        >
          <ChevronIcon open={open} />
        </button>
      </div>

      {/* Collapsible content */}
      {open && (
        <>
          {/* Bullet list */}
          <ul style={{
            margin: 0,
            paddingLeft: 21,
            fontSize: 14,
            fontWeight: 400,
            color: "#292929",
            lineHeight: "16px",
            letterSpacing: "-0.15px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            {lines.map((line, i) => (
              <li key={i}>
                <span style={{ lineHeight: "16px" }}>{line}</span>
              </li>
            ))}
          </ul>

          {/* Feedback row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <FeedbackButton
                type="up"
                active={feedback === "up"}
                onClick={() => setFeedback((f) => (f === "up" ? null : "up"))}
              />
              <FeedbackButton
                type="down"
                active={feedback === "down"}
                onClick={() => setFeedback((f) => (f === "down" ? null : "down"))}
              />
            </div>
            <p style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#292929",
              lineHeight: "16px",
              letterSpacing: "-0.15px",
              margin: 0,
              flex: 1,
            }}>
              This is a beta version of our Key Headlines. We would love to get your feedback.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
