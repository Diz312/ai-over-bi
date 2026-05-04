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

import { Fragment } from "react";
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

const DEFAULT_GAP = 16;

export const biRenderers: CatalogRenderers<BIDefinitions> = {
  KPICard:        ({ props }) => <KPICard {...props} />,
  BarChart:       ({ props }) => <BarChart {...props} />,
  LineChart:      ({ props }) => <LineChart {...props} />,
  AreaChart:      ({ props }) => <AreaChart {...props} />,
  PieChart:       ({ props }) => <PieChart {...props} />,
  DataTable:      ({ props }) => <DataTable {...props} />,
  ComparisonCard: ({ props }) => <ComparisonCard {...props} />,
  InsightBanner:  ({ props }) => <InsightBanner {...props} />,

  // Layout primitives. `children` here is the buildChild function injected by
  // the A2UI renderer — calling it with a child id resolves that id to its
  // rendered React node.
  LayoutColumn: ({ props, children }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: props.gap ?? DEFAULT_GAP,
        width: "100%",
      }}
    >
      {(props.children ?? []).map((id, i) => (
        <Fragment key={`${id}-${i}`}>{children(id)}</Fragment>
      ))}
    </div>
  ),

  LayoutRow: ({ props, children }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: props.gap ?? DEFAULT_GAP,
        width: "100%",
        alignItems: "stretch",
      }}
    >
      {(props.children ?? []).map((id, i) => (
        <div
          key={`${id}-${i}`}
          style={{ flex: "1 1 0", minWidth: 0 }}
        >
          {children(id)}
        </div>
      ))}
    </div>
  ),
};
