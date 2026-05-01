"use client";

import { useState } from "react";
import type { DataTableProps, DataTableColumn } from "@/types/viz";
import {
  BACKFILL_HIGHLIGHT,
  BORDER_CARD,
  BRAND_WHITE,
  formatValue,
  SECONDARY_BLACK,
  SECONDARY_GREY,
  TYPO_GRAPH_LABEL,
  TYPO_P1_BOLD,
  TYPO_P2_BOLD,
} from "@/lib/theme";

function cellFormat(value: number | string, col: DataTableColumn): string {
  if (typeof value === "string") return value;
  switch (col.type) {
    case "currency":   return formatValue(value, "currency");
    case "percentage": return formatValue(value, "percentage");
    case "number":     return formatValue(value, "number");
    default:           return String(value);
  }
}

// Figma SortIcons: default both chevrons in SECONDARY_GREY; active direction in SECONDARY_BLACK.
function SortChevrons({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
  const up   = active && dir === "asc"  ? SECONDARY_BLACK : SECONDARY_GREY;
  const down = active && dir === "desc" ? SECONDARY_BLACK : SECONDARY_GREY;
  return (
    <svg
      width="9"
      height="16"
      viewBox="0 0 9 16"
      fill="none"
      style={{ flexShrink: 0, display: "block" }}
      aria-hidden
    >
      <path d="M4.5 1L1 6.5h7L4.5 1z" fill={up} />
      <path d="M4.5 15L1 9.5h7L4.5 15z" fill={down} />
    </svg>
  );
}

export function DataTable({ title, columns, rows, caption }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rows;

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const lastColIdx = columns.length - 1;

  return (
    <div style={{
      border: BORDER_CARD,
      borderRadius: 4,
      overflow: "hidden",
    }}>
      {/* Optional title — P1 Bold */}
      {title && (
        <div style={{
          ...TYPO_P1_BOLD,
          padding: "16px 16px 12px",
          borderBottom: BORDER_CARD,
          background: BRAND_WHITE,
        }}>
          {title}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col, ci) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    ...TYPO_P2_BOLD,
                    padding: "8px 16px",
                    textAlign: col.align ?? (col.type !== "string" ? "right" : "left"),
                    whiteSpace: "nowrap",
                    background: BRAND_WHITE,
                    borderBottom: BORDER_CARD,
                    borderRight: ci < lastColIdx ? BORDER_CARD : "none",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {col.label}
                    <SortChevrons
                      active={sortKey === col.key}
                      dir={sortKey === col.key ? sortDir : undefined}
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => {
              const isLast = ri === sorted.length - 1;
              // Figma: first row (pinned total/summary) gets Backfill Highlight; all
              // other rows are plain white — no alternating stripes.
              const rowBg = ri === 0 ? BACKFILL_HIGHLIGHT : BRAND_WHITE;

              return (
                <tr key={ri}>
                  {columns.map((col, ci) => {
                    const raw = row[col.key];
                    const display = raw != null ? cellFormat(raw, col) : "—";

                    return (
                      <td
                        key={col.key}
                        style={{
                          // 12px tabular-nums — smaller than P2 to fit dense data tables.
                          padding: "8px 16px",
                          minHeight: 40,
                          textAlign: col.align ?? (col.type !== "string" ? "right" : "left"),
                          fontSize: 12,
                          fontWeight: 400,
                          color: SECONDARY_BLACK,
                          lineHeight: "16px",
                          letterSpacing: "-0.15px",
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                          background: rowBg,
                          borderBottom: !isLast ? BORDER_CARD : "none",
                          borderRight: ci < lastColIdx ? BORDER_CARD : "none",
                        }}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Caption — Graph Label */}
      {caption && (
        <div style={{
          ...TYPO_GRAPH_LABEL,
          lineHeight: "14px",
          padding: "8px 16px 12px",
          borderTop: BORDER_CARD,
          background: BRAND_WHITE,
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}
