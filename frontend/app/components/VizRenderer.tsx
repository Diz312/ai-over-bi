"use client";

import type { VizPayload } from "@/types/viz";
import { KPICard }        from "./viz/KPICard";
import { BarChart }       from "./viz/BarChart";
import { LineChart }      from "./viz/LineChart";
import { AreaChart }      from "./viz/AreaChart";
import { PieChart }       from "./viz/PieChart";
import { DataTable }      from "./viz/DataTable";
import { ComparisonCard } from "./viz/ComparisonCard";

interface VizRendererProps {
  visualizations: VizPayload[];
}

/**
 * VizRenderer — maps VizPayload[] from agent state to React components.
 *
 * Layout strategy:
 *   1. KPI cards — responsive grid, up to 4 across
 *   2. Comparison cards — 2-column grid
 *   3. Charts (bar / line / area) — full width, stacked
 *   4. Data tables — full width, at bottom for drilldown
 *
 * To swap chart libraries (e.g. Recharts → Nivo): update component internals
 * in ./viz/*.tsx — this file and the VizPayload contract are not touched.
 */
export function VizRenderer({ visualizations }: VizRendererProps) {
  const kpiCards      = visualizations.filter(v => v.vizType === "kpi_card");
  const compCards     = visualizations.filter(v => v.vizType === "comparison_card");
  const barCharts     = visualizations.filter(v => v.vizType === "bar_chart");
  const lineCharts    = visualizations.filter(v => v.vizType === "line_chart");
  const areaCharts    = visualizations.filter(v => v.vizType === "area_chart");
  const pieCharts     = visualizations.filter(v => v.vizType === "pie_chart");
  const tables        = visualizations.filter(v => v.vizType === "data_table");

  const kpiCols = Math.min(kpiCards.length, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPI cards ── */}
      {kpiCards.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${kpiCols}, minmax(0, 1fr))`,
          gap: 16,
        }}>
          {kpiCards.map((v, i) =>
            v.vizType === "kpi_card" ? <KPICard key={i} {...v.props} /> : null
          )}
        </div>
      )}

      {/* ── Comparison cards ── */}
      {compCards.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: compCards.length === 1 ? "1fr" : "repeat(2, 1fr)",
          gap: 16,
        }}>
          {compCards.map((v, i) =>
            v.vizType === "comparison_card" ? <ComparisonCard key={i} {...v.props} /> : null
          )}
        </div>
      )}

      {/* ── Area charts ── */}
      {areaCharts.map((v, i) =>
        v.vizType === "area_chart" ? <AreaChart key={i} {...v.props} /> : null
      )}

      {/* ── Line charts ── */}
      {lineCharts.map((v, i) =>
        v.vizType === "line_chart" ? <LineChart key={i} {...v.props} /> : null
      )}

      {/* ── Bar charts ── */}
      {barCharts.map((v, i) =>
        v.vizType === "bar_chart" ? <BarChart key={i} {...v.props} /> : null
      )}

      {/* ── Pie charts ── */}
      {pieCharts.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: pieCharts.length === 1 ? "1fr" : "repeat(2, 1fr)",
          gap: 16,
        }}>
          {pieCharts.map((v, i) =>
            v.vizType === "pie_chart" ? <PieChart key={i} {...v.props} /> : null
          )}
        </div>
      )}

      {/* ── Data tables ── */}
      {tables.map((v, i) =>
        v.vizType === "data_table" ? <DataTable key={i} {...v.props} /> : null
      )}

    </div>
  );
}
