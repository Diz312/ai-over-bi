/**
 * Theme module — single source of truth for visual design tokens.
 *
 * Import from `@/lib/theme` rather than the individual sub-modules so
 * grep / refactor stays consistent across the codebase.
 *
 *   import { SECONDARY_BLACK, TYPO_P1_BOLD, SHADOW_CARD } from "@/lib/theme";
 */

export * from "./colors";
export * from "./typography";
export * from "./effects";
export * from "./formatters";
