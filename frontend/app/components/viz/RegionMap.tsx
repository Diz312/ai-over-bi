"use client";

import { useState, useRef } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import type { RegionMapProps, QuickBiteRegion } from "@/types/viz";
import {
  CHART_DARK_BLUE,
  SECONDARY_BLACK,
  SHADOW_CARD,
  TYPO_GRAPH_LABEL,
  TYPO_P1_BOLD,
  formatValue,
} from "@/lib/theme";

const US_ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const STATE_TO_REGION: Record<string, QuickBiteRegion> = {
  // Northeast
  Connecticut: "Northeast", Delaware: "Northeast", Maine: "Northeast",
  Maryland: "Northeast", Massachusetts: "Northeast", "New Hampshire": "Northeast",
  "New Jersey": "Northeast", "New York": "Northeast", Pennsylvania: "Northeast",
  "Rhode Island": "Northeast", Vermont: "Northeast", "District of Columbia": "Northeast",
  // Southeast
  Alabama: "Southeast", Arkansas: "Southeast", Florida: "Southeast",
  Georgia: "Southeast", Kentucky: "Southeast", Louisiana: "Southeast",
  Mississippi: "Southeast", "North Carolina": "Southeast", "South Carolina": "Southeast",
  Tennessee: "Southeast", Virginia: "Southeast", "West Virginia": "Southeast",
  // Midwest
  Iowa: "Midwest", Illinois: "Midwest", Indiana: "Midwest", Kansas: "Midwest",
  Michigan: "Midwest", Minnesota: "Midwest", Missouri: "Midwest",
  "North Dakota": "Midwest", Nebraska: "Midwest", Ohio: "Midwest",
  "South Dakota": "Midwest", Wisconsin: "Midwest",
  // Southwest
  Arizona: "Southwest", "New Mexico": "Southwest", Oklahoma: "Southwest", Texas: "Southwest",
  // West
  Alaska: "West", California: "West", Colorado: "West", Hawaii: "West",
  Idaho: "West", Montana: "West", Nevada: "West", Oregon: "West",
  Utah: "West", Washington: "West", Wyoming: "West",
};

// Light ice-blue (#C2D9F0) → CHART_DARK_BLUE (#103C82)
const LOW_RGB:  [number, number, number] = [0xc2, 0xd9, 0xf0];
const HIGH_RGB: [number, number, number] = [0x10, 0x3c, 0x82];

function interpolateColor(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(LOW_RGB[0] + (HIGH_RGB[0] - LOW_RGB[0]) * c);
  const g = Math.round(LOW_RGB[1] + (HIGH_RGB[1] - LOW_RGB[1]) * c);
  const b = Math.round(LOW_RGB[2] + (HIGH_RGB[2] - LOW_RGB[2]) * c);
  return `rgb(${r},${g},${b})`;
}

type TooltipState = {
  region: string;
  value: number;
  label?: string | null;
  x: number;
  y: number;
} | null;

const LEGEND_TICKS = ["0%", "25%", "50%", "75%", "100"] as const;

export function RegionMap({ title, regions, metric, value_format = "number" }: RegionMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const mapRef                = useRef<HTMLDivElement>(null);

  const regionLookup = Object.fromEntries(regions.map(r => [r.region, r]));
  const values       = regions.map(r => r.value);
  const minVal       = Math.min(...values);
  const maxVal       = Math.max(...values);

  function getColor(stateName: string): string {
    const region = STATE_TO_REGION[stateName];
    if (!region || !(region in regionLookup)) return "#E8E8E8";
    const t = maxVal === minVal
      ? 0.5
      : (regionLookup[region].value - minVal) / (maxVal - minVal);
    return interpolateColor(t);
  }

  function updateTooltip(e: React.MouseEvent<SVGPathElement>, stateName: string) {
    const region = STATE_TO_REGION[stateName];
    if (!region || !(region in regionLookup)) { setTooltip(null); return; }
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      region,
      value: regionLookup[region].value,
      label: regionLookup[region].label,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 4,
      padding: 24,
      boxShadow: SHADOW_CARD,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {title && (
        <p style={{ ...TYPO_P1_BOLD, margin: 0, color: SECONDARY_BLACK }}>{title}</p>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>

        {/* Left panel — color legend */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 16,
          alignItems: "center", width: 56, flexShrink: 0,
        }}>
          {/* Gradient legend bar + tick labels */}
          <div style={{ flex: 1, display: "flex", gap: 8, minHeight: 200 }}>
            <div style={{
              width: 16,
              borderRadius: 4,
              background: `linear-gradient(to bottom, #C2D9F0, ${CHART_DARK_BLUE})`,
              border: "2px solid #FFFFFF",
              flexShrink: 0,
            }} />
            <div style={{
              display: "flex", flexDirection: "column",
              justifyContent: "space-between",
              ...TYPO_GRAPH_LABEL,
              color: SECONDARY_BLACK,
            }}>
              {LEGEND_TICKS.map(tick => <span key={tick}>{tick}</span>)}
            </div>
          </div>
        </div>

        {/* Map */}
        <div
          ref={mapRef}
          style={{ flex: 1, minWidth: 0, position: "relative" }}
        >
          <ComposableMap
            projection="geoAlbersUsa"
            style={{ width: "100%", height: 400 }}
          >
            <Geographies geography={US_ATLAS_URL}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const stateName = String(geo.properties.name ?? "");
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getColor(stateName)}
                        stroke="#FFFFFF"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover:   { outline: "none", opacity: 0.8, cursor: "crosshair" },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={(e) => updateTooltip(e, stateName)}
                        onMouseMove={(e)  => updateTooltip(e, stateName)}
                        onMouseLeave={()  => setTooltip(null)}
                      />
                    );
                  })
                }
              </Geographies>
          </ComposableMap>

          {/* Hover tooltip */}
          {tooltip && (
            <div style={{
              position: "absolute",
              left: tooltip.x + 12,
              top:  tooltip.y - 44,
              background: SECONDARY_BLACK,
              color: "#FFFFFF",
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 12,
              lineHeight: "18px",
              pointerEvents: "none",
              zIndex: 50,
              whiteSpace: "nowrap",
            }}>
              <span style={{ fontWeight: 700 }}>{tooltip.region}</span>
              {" · "}
              <span>{tooltip.label ?? formatValue(tooltip.value, value_format)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Region legend — value per region below the map */}
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap",
        paddingTop: 8, borderTop: `1px solid #E8E8E8`,
      }}>
        {regions.map(r => {
          const t = maxVal === minVal
            ? 0.5
            : (r.value - minVal) / (maxVal - minVal);
          return (
            <div key={r.region} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 12, height: 12, borderRadius: 2, flexShrink: 0,
                background: interpolateColor(t),
                border: "1px solid #E8E8E8",
              }} />
              <span style={{ ...TYPO_GRAPH_LABEL, color: SECONDARY_BLACK }}>
                {r.region}: {r.label ?? formatValue(r.value, value_format)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
