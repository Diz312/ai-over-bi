"use client";
/**
 * Zustand store for the observe page.
 * Single source of truth for:
 *   - active session id
 *   - current turn spans / metrics
 *   - selected node (cross-links graph ↔ event log)
 *   - selected turn (for history replay)
 *   - turn history list
 *   - session totals
 *   - static prompt tokens
 */

import { create } from "zustand";
import type {
  AgUIEvent,
  NodeStatus,
  SessionTotals,
  Span,
  StaticTokens,
  TurnDetail,
  TurnSummary,
} from "./types";

// Per-node runtime state (drives React Flow node data)
export interface NodeRuntimeState {
  status: NodeStatus;
  tokensIn?: number;
  tokensOut?: number;
  tokensCached?: number;
  costUsd?: number;
  elapsedMs?: number;
  ttftMs?: number;
  contextUtilizationPct?: number;
  activeSpanId?: string;
  error?: string;
}

export interface ObserveStore {
  // Session
  sessionId: string;
  setSessionId: (id: string) => void;

  // Node runtime states keyed by node ID (agent name or tool name)
  nodeStates: Record<string, NodeRuntimeState>;
  setNodeState: (nodeId: string, state: Partial<NodeRuntimeState>) => void;
  resetNodeStates: () => void;

  // Spans for the current turn
  currentSpans: Span[];
  addSpan: (span: Span) => void;
  updateSpan: (span: Span) => void;
  clearCurrentSpans: () => void;

  // AG-UI events for the current turn
  currentAgUIEvents: AgUIEvent[];
  addAgUIEvent: (event: AgUIEvent) => void;
  clearAgUIEvents: () => void;

  // Selected node (cross-links graph ↔ detail panel ↔ event log)
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Event log scroll-to (cross-link: clicking node scrolls log)
  scrollToEventIndex: number | null;
  setScrollToEventIndex: (idx: number | null) => void;

  // Current turn metadata
  currentTurnId: string | null;
  currentQuestion: string;
  turnStartedAt: number | null;
  ttftMs: number | null;
  setCurrentTurn: (turnId: string, question: string, startedAt: number) => void;
  setTtft: (ms: number) => void;
  clearCurrentTurn: () => void;

  // Turn history
  turnHistory: TurnSummary[];
  setTurnHistory: (turns: TurnSummary[]) => void;
  addTurnToHistory: (turn: TurnSummary) => void;

  // Selected historical turn (for replay/detail view)
  selectedTurnDetail: TurnDetail | null;
  setSelectedTurnDetail: (turn: TurnDetail | null) => void;

  // Turns selected for comparison (max 2)
  comparisonTurnIds: string[];
  toggleComparisonTurn: (turnId: string) => void;
  clearComparison: () => void;

  // Session totals
  sessionTotals: SessionTotals | null;
  setSessionTotals: (totals: SessionTotals) => void;

  // Static prompt tokens (loaded once from backend)
  staticTokens: StaticTokens | null;
  setStaticTokens: (tokens: StaticTokens) => void;

  // Running state
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
}

export const useObserveStore = create<ObserveStore>((set, get) => ({
  // Session
  sessionId: `obs-${Date.now()}`,
  setSessionId: (id) => set({ sessionId: id }),

  // Node states
  nodeStates: {},
  setNodeState: (nodeId, state) =>
    set((s) => ({
      nodeStates: {
        ...s.nodeStates,
        [nodeId]: { ...s.nodeStates[nodeId], ...state },
      },
    })),
  resetNodeStates: () => set({ nodeStates: {} }),

  // Spans
  currentSpans: [],
  addSpan: (span) => set((s) => ({ currentSpans: [...s.currentSpans, span] })),
  updateSpan: (span) =>
    set((s) => ({
      currentSpans: s.currentSpans.map((sp) =>
        sp.span_id === span.span_id ? span : sp
      ),
    })),
  clearCurrentSpans: () => set({ currentSpans: [] }),

  // AG-UI events
  currentAgUIEvents: [],
  addAgUIEvent: (event) =>
    set((s) => ({ currentAgUIEvents: [...s.currentAgUIEvents, event] })),
  clearAgUIEvents: () => set({ currentAgUIEvents: [] }),

  // Selection
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  scrollToEventIndex: null,
  setScrollToEventIndex: (idx) => set({ scrollToEventIndex: idx }),

  // Current turn
  currentTurnId: null,
  currentQuestion: "",
  turnStartedAt: null,
  ttftMs: null,
  setCurrentTurn: (turnId, question, startedAt) =>
    set({ currentTurnId: turnId, currentQuestion: question, turnStartedAt: startedAt, ttftMs: null }),
  setTtft: (ms) => set({ ttftMs: ms }),
  clearCurrentTurn: () =>
    set({ currentTurnId: null, currentQuestion: "", turnStartedAt: null, ttftMs: null }),

  // Turn history
  turnHistory: [],
  setTurnHistory: (turns) => set({ turnHistory: turns }),
  addTurnToHistory: (turn) =>
    set((s) => ({
      turnHistory: [turn, ...s.turnHistory.filter((t) => t.turn_id !== turn.turn_id)],
    })),

  selectedTurnDetail: null,
  setSelectedTurnDetail: (turn) => set({ selectedTurnDetail: turn }),

  comparisonTurnIds: [],
  toggleComparisonTurn: (turnId) =>
    set((s) => {
      const ids = s.comparisonTurnIds;
      if (ids.includes(turnId)) return { comparisonTurnIds: ids.filter((id) => id !== turnId) };
      if (ids.length >= 2) return { comparisonTurnIds: [ids[1], turnId] };
      return { comparisonTurnIds: [...ids, turnId] };
    }),
  clearComparison: () => set({ comparisonTurnIds: [] }),

  sessionTotals: null,
  setSessionTotals: (totals) => set({ sessionTotals: totals }),

  staticTokens: null,
  setStaticTokens: (tokens) => set({ staticTokens: tokens }),

  isRunning: false,
  setIsRunning: (v) => set({ isRunning: v }),
}));
