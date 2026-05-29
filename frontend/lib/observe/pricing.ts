/** Cost helpers — mirrors of observability.py PRICING table. */

export const PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "claude-sonnet-4-6":          { inputPerMTok: 3.00,  outputPerMTok: 15.00 },
  "claude-haiku-4-5-20251001":  { inputPerMTok: 0.80,  outputPerMTok: 4.00  },
  "claude-3.5-haiku":           { inputPerMTok: 0.80,  outputPerMTok: 4.00  },
};

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "claude-sonnet-4-6":         200_000,
  "claude-haiku-4-5-20251001": 200_000,
  "claude-3.5-haiku":          200_000,
};

export function computeCost(
  model: string,
  tokensIn: number,
  tokensOut: number,
  tokensCached = 0,
): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-4-6"];
  const effectiveInput = Math.max(0, tokensIn - tokensCached) + tokensCached * 0.1;
  return (
    (effectiveInput * p.inputPerMTok) / 1_000_000 +
    (tokensOut * p.outputPerMTok) / 1_000_000
  );
}

export function contextUtilization(model: string, tokensIn: number): number {
  const limit = MODEL_CONTEXT_LIMITS[model] ?? 200_000;
  return Math.round((tokensIn / limit) * 1000) / 10;
}
