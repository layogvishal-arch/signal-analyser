// Aggregated per-day metrics used by the Summary view and PM Debug Panel.
// Pure computation from a day's emails — no store mutation.

import { BUCKETS, type BucketId } from "./buckets";
import type { EmailDay, DayMetrics } from "./types";

export function computeDayMetrics(day: EmailDay): DayMetrics {
  const total = day.emails.length;
  let autoCount = 0;
  let suggestedApproved = 0;
  let suggestedOverridden = 0;
  let manualCount = 0;
  let overrideCount = 0;
  let confidenceSum = 0;

  const perBucket: Record<BucketId, number> = {
    bug: 0, billing: 0, appreciation: 0, feature: 0, access: 0, other: 0,
  };

  for (const e of day.emails) {
    confidenceSum += e.initialScore.winnerScore;
    if (e.assignedBucket) perBucket[e.assignedBucket]++;

    // An email contributes to exactly one category here.
    if (e.initialTier === "auto") {
      autoCount++;
    }
    if (e.status === "approved") suggestedApproved++;
    if (e.status === "overridden") {
      overrideCount++;
      if (e.initialTier === "suggest") suggestedOverridden++;
    }
    if (e.status === "manual") manualCount++;
  }

  return {
    dayNumber: day.dayNumber,
    total,
    autoCount,
    suggestedApproved,
    suggestedOverridden,
    manualCount,
    overrideRate: total === 0 ? 0 : overrideCount / total,
    autoRate: total === 0 ? 0 : autoCount / total,
    avgConfidence: total === 0 ? 0 : confidenceSum / total,
    perBucket,
  };
}

export function computeAllMetrics(days: EmailDay[]): DayMetrics[] {
  return days.map(computeDayMetrics);
}

export { BUCKETS };
