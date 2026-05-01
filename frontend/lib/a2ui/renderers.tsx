"use client";

/**
 * A2UI catalog renderers — maps each component definition to a React component.
 *
 * Each renderer receives `{ props }` from the A2UI runtime. Values are already
 * resolved — if the component schema declares a `dataBinding` path, the runtime
 * resolves it before invoking the renderer. Components are inherently
 * binding-aware; no special wiring needed at this layer.
 *
 * Wrappers are intentionally thin — all visual logic lives in viz/*.tsx so the
 * chart library / styling can be swapped without touching the catalog wiring.
 */

import type { CatalogRenderers } from "@copilotkit/a2ui-renderer";
import type { BIDefinitions } from "./definitions";

import { KPICard }        from "@/app/components/viz/KPICard";
import { BarChart }       from "@/app/components/viz/BarChart";
import { LineChart }      from "@/app/components/viz/LineChart";
import { AreaChart }      from "@/app/components/viz/AreaChart";
import { PieChart }       from "@/app/components/viz/PieChart";
import { DataTable }      from "@/app/components/viz/DataTable";
import { ComparisonCard } from "@/app/components/viz/ComparisonCard";
import { InsightBanner }  from "@/app/components/viz/InsightBanner";

export const biRenderers: CatalogRenderers<BIDefinitions> = {
  KPICard:        ({ props }) => <KPICard {...props} />,
  BarChart:       ({ props }) => <BarChart {...props} />,
  LineChart:      ({ props }) => <LineChart {...props} />,
  AreaChart:      ({ props }) => <AreaChart {...props} />,
  PieChart:       ({ props }) => <PieChart {...props} />,
  DataTable:      ({ props }) => <DataTable {...props} />,
  ComparisonCard: ({ props }) => <ComparisonCard {...props} />,
  InsightBanner:  ({ props }) => <InsightBanner {...props} />,
};
