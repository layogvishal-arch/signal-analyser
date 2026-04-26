// The heart of the signal loop: computing a bucket's effective similarity to
// an email, blending the static seed embedding with the dynamic signal memory.
//
// Final score formula:
//   final = seed_weight × seed_sim + signal_weight × signal_sim
//
// where:
//   signal_weight = min(0.7, n / (n + 20))
//   seed_weight   = 1 - signal_weight
//   signal_sim    = max(0, weighted_avg(cosine_sim(email, each confirmed email)))
//
// This means:
//   - Day 1 with no signals → signal_weight = 0, purely seed-driven.
//   - As signals accumulate, signal_weight grows asymptotically toward 0.7,
//     so the system increasingly relies on learned patterns.
//   - Signal similarity is clamped to 0 — a bucket's signals can never
//     actively repel emails, only add a bonus or add nothing.

import { cosineSimilarity } from "./similarity";
import type { BucketId, Bucket } from "./buckets";
import type { SignalEntry, SignalMemory } from "./signals";

export interface BucketScore {
  bucketId: BucketId;
  finalScore: number;
  seedSim: number;
  signalSim: number;
  seedWeight: number;
  signalWeight: number;
  signalCount: number;
}

export function computeSignalWeight(n: number): number {
  // Asymptotic saturation capped at 0.7. After ~20 signals we're at ~0.5,
  // after ~50 we're at ~0.7 (the cap). This shape makes early signals matter
  // more than later ones, which matches real learning dynamics.
  return Math.min(0.7, n / (n + 20));
}

function weightedAverageSimilarity(
  emailVec: number[],
  entries: SignalEntry[]
): number {
  if (entries.length === 0) return 0;
  let num = 0;
  let den = 0;
  for (const e of entries) {
    const sim = cosineSimilarity(emailVec, e.vector);
    num += e.weight * sim;
    den += e.weight;
  }
  if (den === 0) return 0;
  return num / den;
}

export function scoreBucket(
  emailVec: number[],
  bucket: Bucket,
  seedVec: number[],
  memory: SignalMemory
): BucketScore {
  const seedSim = cosineSimilarity(emailVec, seedVec);

  const entries = memory[bucket.id] ?? [];
  const signalCount = entries.length;
  const rawSignalSim = weightedAverageSimilarity(emailVec, entries);
  // Clamp to 0 — signals only help a bucket, they never hurt it.
  const signalSim = Math.max(0, rawSignalSim);

  const signalWeight = computeSignalWeight(signalCount);
  const seedWeight = 1 - signalWeight;

  const finalScore = seedWeight * seedSim + signalWeight * signalSim;

  return {
    bucketId: bucket.id,
    finalScore,
    seedSim,
    signalSim,
    seedWeight,
    signalWeight,
    signalCount,
  };
}

export interface ScoredEmail {
  winner: BucketId;
  winnerScore: number;
  margin: number;      // gap between winner and runner-up — useful signal
  scores: BucketScore[];
}

// Score an email against all buckets and return a ranked result.
export function scoreEmail(
  emailVec: number[],
  buckets: Bucket[],
  seeds: Record<BucketId, number[]>,
  memory: SignalMemory
): ScoredEmail {
  const scores = buckets.map((b) =>
    scoreBucket(emailVec, b, seeds[b.id], memory)
  );
  // Sort desc by final score.
  const sorted = [...scores].sort((a, b) => b.finalScore - a.finalScore);
  const winner = sorted[0];
  const runnerUp = sorted[1];

  return {
    winner: winner.bucketId,
    winnerScore: winner.finalScore,
    margin: winner.finalScore - runnerUp.finalScore,
    scores,
  };
}
