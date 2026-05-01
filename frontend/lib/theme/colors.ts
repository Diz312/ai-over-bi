/**
 * McDonald's Digital Color Palette
 * Source: Design Components Library — node 3834:5879
 * https://www.figma.com/design/ndRdvcz4uogvcTTF7To63g/Design-Components-Library
 *
 * All color swatches extracted from: Brand Colors, Secondary, Accessible Accents,
 * Charts & Graphs, Semantic, and Backfills sections.
 */

// ── Brand Colors ──────────────────────────────────────────────────────────────

export const BRAND_GOLD        = "#FFBC0D";   // McDonald's Gold
export const BRAND_RED         = "#D90007";   // McDonald's Red
export const BRAND_WHITE       = "#FFFFFF";   // White
export const BRAND_GREEN       = "#264F36";   // McDonald's Green

// ── Secondary ─────────────────────────────────────────────────────────────────

export const SECONDARY_BLACK       = "#292929";   // McDonald's Black
export const SECONDARY_LINK_BLUE   = "#006BAE";   // Link Blue
export const SECONDARY_DARK_GREY   = "#6F6F6F";   // Dark Grey
export const SECONDARY_GREY        = "#ADADAD";   // Grey
export const SECONDARY_LIGHT_GREY  = "#D6D6D6";   // Light Grey
export const SECONDARY_IVORY       = "#F9F9F9";   // Ivory
export const SECONDARY_FUSCHIA     = "#9A0A4D";   // Fuschia

// ── Accessible Accents ────────────────────────────────────────────────────────

export const ACCENT_GOLD        = "#C08B00";   // Accent Gold (accessible version of McDonald's Gold)
export const ACCENT_GREY        = "#959595";   // Accent Grey
export const ACCENT_LIGHT_BLUE  = "#A0D8ED";   // Accent Light Blue (InsightBanner neutral border)

// ── Charts & Graphs ───────────────────────────────────────────────────────────
// Strictly for chart/graph use. Source: McDonald's-branded chart templates.

export const CHART_BEIGE       = "#B69A81";   // Beige
export const CHART_LIGHT_BLUE  = "#56AFD1";   // Light Blue
export const CHART_LIGHT_GREEN = "#A9C141";   // Light Green
export const CHART_DARK_BLUE   = "#103C82";   // Dark Blue

// ── Borders / Grid Lines ──────────────────────────────────────────────────────

export const BORDER_CHART_GRID = "#E8E8E8";   // Chart axis lines + grid stroke

// ── Semantic ──────────────────────────────────────────────────────────────────
// Strictly for alert components and directional indicators.

export const SEMANTIC_SUCCESS = "#1F6437";   // Success (positive direction)
export const SEMANTIC_WARNING = "#FE8234";   // Warning

// ── Backfills ─────────────────────────────────────────────────────────────────
// Background tints for alerts, tables, tiles, and informational components.

export const BACKFILL_RED         = "#FDF2F2";                       // Backfill Red
export const BACKFILL_ORANGE      = "#FFF9F5";                       // Backfill Orange
export const BACKFILL_GREEN       = "#F4F7F5";                       // Backfill Green
export const BACKFILL_GRAY        = "#FAFAFA";                       // Backfill Gray
export const BACKFILL_GOLD        = "#FFFCF5";                       // Backfill Gold
export const BACKFILL_BLUE        = "rgba(86, 175, 209, 0.10)";      // Backfill Blue (#56AFD1 @ 10% over white)
export const BACKFILL_HIGHLIGHT   = "#FFF8E7";                       // Backfill Highlight (DataTable first-row)

// ── Chart color sequence ──────────────────────────────────────────────────────
// Ordered palette for multi-series charts (bar, line, area, pie).
// Index position is the sole authority — agents never supply colors.

export const CHART_COLORS: string[] = [
  CHART_BEIGE,        // series 0
  CHART_LIGHT_BLUE,   // series 1
  CHART_LIGHT_GREEN,  // series 2
  CHART_DARK_BLUE,    // series 3
];
