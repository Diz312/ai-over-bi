"use client";

import { useState } from "react";
import type { DataTableProps, DataTableColumn } from "@/types/viz";
import { formatValue } from "@/lib/format";

function cellFormat(value: number | string, col: DataTableColumn): string {
  if (typeof value === "string") return value;
  switch (col.type) {
    case "currency":   return formatValue(value, "currency");
    case "percentage": return formatValue(value, "percentage");
    case "number":     return formatValue(value, "number");
    default:           return String(value);
  }
}

// Figma SortIcons component: h-[15.5px], gap-[8px] from header label.
// Default: both chevrons in #ADADAD. Active: active direction #292929, other #ADADAD.
function SortChevrons({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
  const up   = active && dir === "asc"  ? "#292929" : "#ADADAD";
  const down = active && dir === "desc" ? "#292929" : "#ADADAD";
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
      border: "1px solid #D6D6D6",
      borderRadius: 4,
      overflow: "hidden",
    }}>
      {/* Optional title — P1 Bold token: 16px Bold #292929 */}
      {title && (
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid #D6D6D6",
          fontSize: 16,
          fontWeight: 700,
          color: "#292929",
          lineHeight: "20px",
          letterSpacing: "-0.15px",
          background: "#FFFFFF",
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
                    // Figma: P2 Bold — 14px Bold, #292929, lh 16px, ls -0.15px
                    padding: "8px 16px",
                    textAlign: col.align ?? (col.type !== "string" ? "right" : "left"),
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#292929",
                    lineHeight: "16px",
                    letterSpacing: "-0.15px",
                    whiteSpace: "nowrap",
                    background: "#FFFFFF",
                    // Figma: border-b border-r border-[#d6d6d6] on each header cell
                    borderBottom: "1px solid #D6D6D6",
                    borderRight: ci < lastColIdx ? "1px solid #D6D6D6" : "none",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {/* Figma: label + SortIcons with gap-[8px] */}
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
              // Figma: first row (pinned total/summary) gets Backfill Highlight #FFF8E7;
              // all other rows are plain white — no alternating stripes.
              const rowBg = ri === 0 ? "#FFF8E7" : "#FFFFFF";

              return (
                <tr key={ri}>
                  {columns.map((col, ci) => {
                    const raw = row[col.key];
                    const display = raw != null ? cellFormat(raw, col) : "—";
                    const isFirstCol = ci === 0;

                    return (
                      <td
                        key={col.key}
                        style={{
                          // Figma:
                          //   First column — P2 Regular: 14px, #292929, lh 16px, ls -0.15px
                          //   Metric columns — Big Number: 20px Regular, #292929, lh 24px, ls -0.1875px
                          padding: "8px 16px",
                          minHeight: 40,
                          textAlign: col.align ?? (col.type !== "string" ? "right" : "left"),
                          fontSize: 12,
                          fontWeight: 400,
                          color: "#292929",
                          lineHeight: "16px",
                          letterSpacing: "-0.15px",
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                          background: rowBg,
                          // Figma: border-b border-r border-[#d6d6d6] on each data cell
                          borderBottom: !isLast ? "1px solid #D6D6D6" : "none",
                          borderRight: ci < lastColIdx ? "1px solid #D6D6D6" : "none",
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

      {/* Caption — Graph Labels token: 11px Regular, #6F6F6F, ls -0.1875px */}
      {caption && (
        <div style={{
          padding: "8px 16px 12px",
          fontSize: 11,
          fontWeight: 400,
          color: "#6F6F6F",
          lineHeight: "14px",
          letterSpacing: "-0.1875px",
          borderTop: "1px solid #D6D6D6",
          background: "#FFFFFF",
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}
