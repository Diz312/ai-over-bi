import type { ValueFormat } from "@/types/viz";

const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const numberFmt   = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatValue(value: number, format: ValueFormat = "number"): string {
  switch (format) {
    case "currency":   return currencyFmt.format(value);
    case "percentage": return `${value.toFixed(1)}%`;
    case "number":     return numberFmt.format(value);
    default:           return String(value);
  }
}

/**
 * Detect which field in a data row holds the category label.
 *
 * Prefers "label" (the canonical contract field). If the agent sent a
 * different string-valued key (quarter, region, period, month, store_name,
 * etc.), falls back to the first string property on the first row. Returns
 * "label" if no string field is found (Recharts will then use index, which
 * at least signals the bug visibly).
 */
export function detectCategoryKey(data: any[]): string {
  if (!data || data.length === 0) return "label";
  const first = data[0] ?? {};
  if (typeof first.label === "string") return "label";
  for (const key of Object.keys(first)) {
    if (typeof first[key] === "string") return key;
  }
  return "label";
}

/** Returns a tick formatter function for Recharts axes. */
export function makeTick(format: ValueFormat): (v: number) => string {
  switch (format) {
    case "currency":
      return (v: number) => {
        if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
        return currencyFmt.format(v);
      };
    case "percentage":
      return (v: number) => `${v.toFixed(1)}%`;
    case "number":
      return (v: number) => {
        if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
        if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
        return numberFmt.format(v);
      };
    default:
      return (v: number) => String(v);
  }
}
