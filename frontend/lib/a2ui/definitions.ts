/**
 * A2UI catalog component definitions.
 *
 * Zod schemas declare the props shape for each custom component in the BI catalog.
 * These MUST mirror agent/src/ai_over_bi/contracts.py — the agent (Python/Pydantic)
 * is the source of truth; this file is the frontend-side validation contract.
 *
 * Server-safe (no React, no DOM access). Renderers live in renderers.tsx.
 */

import { z } from "zod";
import type { CatalogDefinitions } from "@copilotkit/a2ui-renderer";

// ── Shared primitive schemas ──────────────────────────────────────────────────

const valueFormat = z.enum(["number", "currency", "percentage", "raw"]);
const valueFormatNoRaw = z.enum(["number", "currency", "percentage"]);

const delta = z.object({
  value: z.number(),
  type: z.enum(["percentage", "absolute"]),
  direction: z.enum(["up", "down", "flat"]),
  label: z.string().optional(),
});

const trendPoint = z.object({
  period: z.string(),
  value: z.number(),
});

const seriesConfig = z.object({
  key: z.string(),
  label: z.string(),
});

const periodData = z.object({
  label: z.string(),
  value: z.number(),
});

// Chart row: { label: str, [seriesKey]: number | string }
const chartRow = z.record(z.string(), z.union([z.string(), z.number()]));

// Table row: keys mapped to displayable scalars (matches DataTableProps in viz/DataTable.tsx)
const tableRow = z.record(z.string(), z.union([z.string(), z.number()]));

// ── Component definitions ─────────────────────────────────────────────────────

export const biDefinitions = {
  KPICard: {
    description: "Single metric summary card with optional delta badge and sparkline.",
    props: z.object({
      title: z.string(),
      value: z.union([z.number(), z.string()]),
      unit: z.string().optional(),
      value_format: valueFormat.optional(),
      delta: delta.optional(),
      trend: z.array(trendPoint).optional(),
      subtitle: z.string().optional(),
    }),
  },

  BarChart: {
    description: "Categorical bar chart, vertical or horizontal layout.",
    props: z.object({
      title: z.string().optional(),
      data: z.array(chartRow),
      series: z.array(seriesConfig),
      layout: z.enum(["vertical", "horizontal"]).optional(),
      value_format: valueFormatNoRaw.optional(),
      x_axis_label: z.string().optional(),
      y_axis_label: z.string().optional(),
    }),
  },

  LineChart: {
    description: "Time-series line chart.",
    props: z.object({
      title: z.string().optional(),
      data: z.array(chartRow),
      series: z.array(seriesConfig),
      value_format: valueFormatNoRaw.optional(),
      show_dots: z.boolean().optional(),
      x_axis_label: z.string().optional(),
      y_axis_label: z.string().optional(),
    }),
  },

  AreaChart: {
    description: "Filled area chart, optionally stacked.",
    props: z.object({
      title: z.string().optional(),
      data: z.array(chartRow),
      series: z.array(seriesConfig),
      value_format: valueFormatNoRaw.optional(),
      stacked: z.boolean().optional(),
      x_axis_label: z.string().optional(),
      y_axis_label: z.string().optional(),
    }),
  },

  PieChart: {
    description: "Part-to-whole distribution. inner_radius > 0 makes a donut.",
    props: z.object({
      title: z.string().optional(),
      data: z.array(z.object({
        label: z.string(),
        value: z.number(),
      })),
      value_format: valueFormatNoRaw.optional(),
      show_labels: z.boolean().optional(),
      inner_radius: z.number().optional(),
    }),
  },

  DataTable: {
    description: "Sortable tabular detail view.",
    props: z.object({
      title: z.string().optional(),
      columns: z.array(z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(["string", "number", "currency", "percentage"]).optional(),
        align: z.enum(["left", "right", "center"]).optional(),
      })),
      rows: z.array(tableRow),
      caption: z.string().optional(),
    }),
  },

  ComparisonCard: {
    description: "Period-over-period comparison card for a single metric.",
    props: z.object({
      title: z.string(),
      metric: z.string(),
      unit: z.string().optional(),
      value_format: valueFormatNoRaw.optional(),
      current: periodData,
      prior: periodData,
      delta: delta,
      insight: z.string().optional(),
    }),
  },

  // ── Layout primitives ───────────────────────────────────────────────────────
  // We register our own Column/Row instead of using the basic catalog's because
  // the basic renderers silently drop the `gap` prop AND don't give Row children
  // `flex: 1` (so paired charts wouldn't split symmetrically). These two
  // components are the ONLY way the backend composes layout — see
  // agent/src/ai_over_bi/tools/a2ui.py.

  LayoutColumn: {
    description: "Vertical layout container — stacks children with a consistent gap.",
    props: z.object({
      children: z.array(z.string()),
      gap: z.number().optional(),
    }),
  },

  LayoutRow: {
    description: "Horizontal layout container — flex row with equal-width children and a consistent gap.",
    props: z.object({
      children: z.array(z.string()),
      gap: z.number().optional(),
    }),
  },

  InsightBanner: {
    description: "Analyst insight cards — one card per finding, sentiment-coded by background color.",
    props: z.object({
      insights: z.array(z.object({
        headline: z.string(),
        body: z.string(),
        why: z.string().optional(),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      })),
    }),
  },
} satisfies CatalogDefinitions;

export type BIDefinitions = typeof biDefinitions;
