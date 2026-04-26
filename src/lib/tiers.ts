// Confidence tier thresholds. These are product decisions, not engineering
// ones — a PM chooses how aggressive vs. conservative the system should be.
//
// The PRD's starting values (0.82 / 0.55) assumed embedding similarities
// that range higher than what `text-embedding-3-small` actually produces.
// In practice, semantically related but lexically varied texts score in the
// ~0.4–0.6 cosine range with this model — so we recalibrated to that
// distribution. In production this'd be tunable per-bucket and ideally
// learned from agent override rates over time.

export const TIER_AUTO = 0.55;
export const TIER_SUGGEST = 0.35;

export type ConfidenceTier = "auto" | "suggest" | "silent";

export function classifyConfidence(score: number): ConfidenceTier {
  if (score > TIER_AUTO) return "auto";
  if (score >= TIER_SUGGEST) return "suggest";
  return "silent";
}
