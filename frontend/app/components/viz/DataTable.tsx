"use client";

import { useState } from "react";
import type { DataTableProps, DataTableColumn } from "@/types/viz";
import { formatValue } from "@/lib/format";

function cellFormat(value: number | string, col: DataTableColumn): string {
  if (typeof value === "string") return value;
  switch (col.type) {
    case "currency":    return formatValue(value, "currency");
    case "percentage":  return formatValue(value, "percentage");
    case "number":      return formatValue(value, "number");
    default:            return String(value);
  }
}

export function DataTable({ title, columns, rows, caption }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rows;

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 12,
      border: "1px solid #E2E8F0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      overflow: "hidden",
    }}>
      {title && (
        <div style={{
          padding: "16px 24px 12px",
          borderBottom: "1px solid #F1F5F9",
          fontSize: 13,
          fontWeight: 700,
          color: "#0F172A",
          letterSpacing: "-0.01em",
        }}>
          {title}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#F5F5F5" }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: "10px 16px",
                    textAlign: col.align ?? (col.type !== "string" ? "right" : "left"),
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: "1px solid #E2E8F0",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {sortKey === col.key && (
                      <span style={{ fontSize: 9, color: "#FFBC0D" }}>
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr
                key={ri}
                style={{
                  borderBottom: ri < sorted.length - 1 ? "1px solid #F1F5F9" : "none",
                  background: ri % 2 === 0 ? "#FFFFFF" : "#FAFBFC",
                }}
              >
                {columns.map(col => {
                  const raw = row[col.key];
                  const display = raw != null ? cellFormat(raw, col) : "—";
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: "9px 16px",
                        textAlign: col.align ?? (col.type !== "string" ? "right" : "left"),
                        color: col.key === columns[0].key ? "#0F172A" : "#334155",
                        fontWeight: col.key === columns[0].key ? 600 : 400,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caption && (
        <div style={{ padding: "8px 24px 12px", fontSize: 11, color: "#94A3B8" }}>{caption}</div>
      )}
    </div>
  );
}
