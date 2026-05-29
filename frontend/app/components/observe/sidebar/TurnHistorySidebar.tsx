"use client";
/**
 * TurnHistorySidebar — left panel with:
 *   - Session analytics summary
 *   - Search + filter controls
 *   - Turn history list (clickable, with error/cost badges)
 *   - Turn comparison (select 2)
 *   - Turn replay button
 */

import { useState } from "react";
import { useObserveStore } from "../../../../lib/observe/store";
import {
  COLOR_TEXT_MUTED,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  FONT_SM,
  FONT_XL,
  FONT_XS,
  PANEL_BG,
  PANEL_BORDER,
  SIDEBAR_WIDTH,
  formatCost,
  formatMs,
  formatTokens,
} from "../../../../lib/observe/theme";
import { fetchTurnDetail, searchTurns } from "../../../../lib/observe/hooks/useTurnHistory";
import type { TurnSummary } from "../../../../lib/observe/types";

export default function TurnHistorySidebar({
  onReplay,
}: {
  onReplay: (question: string) => void;
}) {
  const sessionId = useObserveStore((s) => s.sessionId);
  const turnHistory = useObserveStore((s) => s.turnHistory);
  const sessionTotals = useObserveStore((s) => s.sessionTotals);
  const selectedTurnDetail = useObserveStore((s) => s.selectedTurnDetail);
  const setSelectedTurnDetail = useObserveStore((s) => s.setSelectedTurnDetail);
  const comparisonTurnIds = useObserveStore((s) => s.comparisonTurnIds);
  const toggleComparisonTurn = useObserveStore((s) => s.toggleComparisonTurn);
  const clearComparison = useObserveStore((s) => s.clearComparison);

  const [searchQuery, setSearchQuery] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [searchResults, setSearchResults] = useState<TurnSummary[] | null>(null);

  const displayTurns = searchResults ?? turnHistory;

  const handleSearch = async () => {
    const results = await searchTurns({
      sessionId,
      query: searchQuery || undefined,
      errorsOnly,
    });
    setSearchResults(results);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setErrorsOnly(false);
    setSearchResults(null);
  };

  const handleSelectTurn = async (turn: TurnSummary) => {
    if (comparing) {
      toggleComparisonTurn(turn.turn_id);
      return;
    }
    if (selectedTurnDetail?.turn_id === turn.turn_id) {
      setSelectedTurnDetail(null);
      return;
    }
    const detail = await fetchTurnDetail(turn.turn_id);
    setSelectedTurnDetail(detail);
  };

  return (
    <div
      style={{
        width: SIDEBAR_WIDTH,
        background: PANEL_BG,
        borderRight: `1px solid ${PANEL_BORDER}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Session analytics */}
      {sessionTotals && (
        <div
          style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${PANEL_BORDER}`,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: FONT_XS, fontWeight: 700, color: COLOR_TEXT_SECONDARY, textTransform: "uppercase" }}>
            Session
          </span>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Turns" value={String(sessionTotals.turn_count)} />
            <Stat label="Total cost" value={formatCost(sessionTotals.total_cost_usd)} />
            <Stat label="Avg cost" value={formatCost(sessionTotals.avg_cost_usd)} />
            <Stat label="Saved" value={formatCost(sessionTotals.total_cache_savings_usd)} highlight />
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div
        style={{
          padding: "8px 10px",
          borderBottom: `1px solid ${PANEL_BORDER}`,
          display: "flex",
          flexDirection: "column",
          gap: 5,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search turns..."
            style={{
              flex: 1,
              fontSize: FONT_XS,
              padding: "4px 7px",
              border: `1px solid ${PANEL_BORDER}`,
              borderRadius: 4,
              outline: "none",
            }}
          />
          <button
            onClick={handleSearch}
            style={btnStyle}
          >
            Go
          </button>
          {searchResults && (
            <button onClick={handleClearSearch} style={btnStyle}>
              ✕
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={errorsOnly}
              onChange={(e) => setErrorsOnly(e.target.checked)}
            />
            Errors only
          </label>
          <button
            onClick={() => {
              setComparing((v) => !v);
              clearComparison();
            }}
            style={{
              ...btnStyle,
              background: comparing ? "#6366F1" : undefined,
              color: comparing ? "white" : undefined,
              marginLeft: "auto",
            }}
          >
            {comparing ? "Cancel" : "Compare"}
          </button>
        </div>
        {comparing && comparisonTurnIds.length === 2 && (
          <ComparisonView turnIds={comparisonTurnIds} turns={displayTurns} />
        )}
      </div>

      {/* Turn list */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {displayTurns.length === 0 && (
          <div style={{ padding: 14, fontSize: FONT_SM, color: COLOR_TEXT_MUTED }}>
            No turns yet. Run a question below.
          </div>
        )}
        {displayTurns.map((turn) => (
          <TurnItem
            key={turn.turn_id}
            turn={turn}
            isSelected={selectedTurnDetail?.turn_id === turn.turn_id}
            isComparing={comparing}
            isInComparison={comparisonTurnIds.includes(turn.turn_id)}
            onSelect={() => handleSelectTurn(turn)}
            onReplay={() => onReplay(turn.question)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TurnItem
// ---------------------------------------------------------------------------

function TurnItem({
  turn,
  isSelected,
  isComparing,
  isInComparison,
  onSelect,
  onReplay,
}: {
  turn: TurnSummary;
  isSelected: boolean;
  isComparing: boolean;
  isInComparison: boolean;
  onSelect: () => void;
  onReplay: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "8px 12px",
        borderBottom: `1px solid ${PANEL_BORDER}`,
        cursor: "pointer",
        background: isSelected
          ? "#EEF2FF"
          : isInComparison
          ? "#FEF9C3"
          : "transparent",
        transition: "background 0.1s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span
          style={{
            fontSize: FONT_SM,
            color: COLOR_TEXT_PRIMARY,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingRight: 6,
          }}
        >
          {turn.question || "(no question)"}
        </span>
        {turn.error && (
          <span
            style={{
              fontSize: FONT_XS,
              background: "#FEE2E2",
              color: "#EF4444",
              borderRadius: 3,
              padding: "1px 4px",
              flexShrink: 0,
            }}
          >
            error
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
        {turn.total_cost > 0 && (
          <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_SECONDARY }}>
            {formatCost(turn.total_cost)}
          </span>
        )}
        {turn.elapsed_ms != null && (
          <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
            {formatMs(turn.elapsed_ms)}
          </span>
        )}
        {turn.ttft_ms != null && (
          <span style={{ fontSize: FONT_XS, color: COLOR_TEXT_MUTED }}>
            TTFT {formatMs(turn.ttft_ms)}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onReplay(); }}
          style={{ ...btnStyle, marginLeft: "auto", fontSize: "10px", padding: "0px 5px" }}
          title="Replay this turn"
        >
          ↩ Replay
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComparisonView
// ---------------------------------------------------------------------------

function ComparisonView({ turnIds, turns }: { turnIds: string[]; turns: TurnSummary[] }) {
  const a = turns.find((t) => t.turn_id === turnIds[0]);
  const b = turns.find((t) => t.turn_id === turnIds[1]);
  if (!a || !b) return null;

  return (
    <div
      style={{
        background: "#FFFBEB",
        border: `1px solid #FDE68A`,
        borderRadius: 4,
        padding: "6px 8px",
        fontSize: FONT_XS,
        color: COLOR_TEXT_PRIMARY,
      }}
    >
      <span style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Comparing</span>
      <CompRow label="Cost" a={formatCost(a.total_cost)} b={formatCost(b.total_cost)} />
      <CompRow
        label="Tokens"
        a={formatTokens(a.total_tokens_in + a.total_tokens_out)}
        b={formatTokens(b.total_tokens_in + b.total_tokens_out)}
      />
      <CompRow
        label="Elapsed"
        a={a.elapsed_ms != null ? formatMs(a.elapsed_ms) : "—"}
        b={b.elapsed_ms != null ? formatMs(b.elapsed_ms) : "—"}
      />
      <CompRow
        label="TTFT"
        a={a.ttft_ms != null ? formatMs(a.ttft_ms) : "—"}
        b={b.ttft_ms != null ? formatMs(b.ttft_ms) : "—"}
      />
      <CompRow label="Agents" a={a.agents_invoked.join(", ")} b={b.agents_invoked.join(", ")} />
    </div>
  );
}

function CompRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
      <span style={{ width: 50, color: COLOR_TEXT_SECONDARY }}>{label}</span>
      <span style={{ flex: 1 }}>{a}</span>
      <span style={{ color: COLOR_TEXT_MUTED }}>vs</span>
      <span style={{ flex: 1, textAlign: "right" }}>{b}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: "10px", color: COLOR_TEXT_MUTED }}>{label}</span>
      <span
        style={{
          fontSize: FONT_SM,
          fontWeight: 700,
          color: highlight ? "#10B981" : COLOR_TEXT_PRIMARY,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: FONT_XS,
  padding: "2px 7px",
  border: `1px solid ${PANEL_BORDER}`,
  borderRadius: 4,
  background: "white",
  cursor: "pointer",
  color: COLOR_TEXT_SECONDARY,
};
