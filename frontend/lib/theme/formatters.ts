/**
 * Number formatters — presentation logic for rendering numeric values.
 *
 * Sits alongside colors / typography / effects in the theme module because
 * it shapes "how data is presented to the user." Visual styling tells you
 * what colors and fonts to use; formatters tell you what string to render.
 *
 * Locale is fixed to en-US / USD for now. If we ever support other locales,
 * lift `currencyFmt` and `numberFmt` into a factory keyed by locale.
 */

import type { ValueFormat } from "@/types/viz";

const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const numberFmt   = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * Format a single numeric value for inline display (cards, tooltips, table cells).
 *
 *   formatValue(1234567, "currency")   → "$1,234,567"
 *   formatValue(1234567, "number")     → "1,234,567"
 *   formatValue(12.5,    "percentage") → "12.5%"
 *   formatValue(42,      "raw")        → "42"
 */
export function formatValue(value: number, format: ValueFormat = "number"): string {
  switch (format) {
    case "currency":   return currencyFmt.format(value);
    case "percentage": return `${value.toFixed(1)}%`;
    case "number":     return numberFmt.format(value);
    default:           return String(value);
  }
}

/**
 * Returns a Recharts-compatible tick formatter that compacts large numbers.
 *
 *   makeTick("currency")(1_500_000)  → "$1.5M"
 *   makeTick("number")(250_000)      → "250K"
 *   makeTick("percentage")(12.5)     → "12.5%"
 *
 * Used on chart axes where full-width values like "$1,234,567" don't fit.
 */
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
