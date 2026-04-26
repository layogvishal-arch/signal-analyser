// Signal memory and the weight schedule that governs how agent actions
// feed back into the system.
//
// Design notes:
// - Each confirmed email is stored as { emailId, weight }. The weight
//   reflects how informative the signal was (explicit approval = stronger
//   than implicit, override = strongest). The vector is NOT stored here —
//   it's resolved at scoring time from the static embeddings dictionary
//   (embeddings.json), since that data is already in memory and committed
//   with the repo. This keeps the persisted store small enough to fit in
//   localStorage's ~5MB budget no matter how many days run.
// - Memory is capped at 50 entries per bucket (FIFO). In production you'd
//   use time-decayed weights or a sliding window; the cap keeps localStorage
//   tidy for the demo while demonstrating the same product thinking.
// - Historical overrides are supported: if an agent later changes a past
//   email's bucket, the store replays the signal with fresh weight.

import type { BucketId } from "./buckets";

export const MEMORY_CAP = 50;

export interface SignalEntry {
  emailId: string;    // so historical overrides can replace an old entry
  weight: number;
}

export type SignalMemory = Record<BucketId, SignalEntry[]>;

// Signal weights per agent action, from the PRD. Higher = more informative.
// Overrides carry the strongest positive weight because they're unambiguous
// explicit corrections; implicit approvals are weakest because inaction
// could mean anything.
export const SIGNAL_WEIGHTS = {
  implicitApprove: 0.3,       // agent left an auto-categorized email alone
  explicitApprove: 0.5,       // agent clicked approve on a suggestion
  overrideCorrect: 0.8,       // agent moved the email to this bucket
  overrideWrong: -0.4,        // agent moved the email away from this bucket
  manualCategorize: 0.6,      // agent picked a bucket with no suggestion
} as const;

export function emptyMemory(): SignalMemory {
  return {
    bug: [],
    billing: [],
    appreciation: [],
    feature: [],
    access: [],
    other: [],
  };
}

// Add a signal to memory. If we already have an entry for this email in any
// bucket, we replace it — this makes historical overrides clean: moving an
// email from bug → billing removes its bug entry and adds a billing one.
//
// Returns a new memory object (pure function, safe to use in Zustand).
export function applySignal(
  memory: SignalMemory,
  bucket: BucketId,
  emailId: string,
  weight: number
): SignalMemory {
  const next: SignalMemory = { ...memory };

  // Remove any prior entry for this email across all buckets. This handles
  // historical overrides and also prevents double-counting.
  for (const b of Object.keys(next) as BucketId[]) {
    if (next[b].some((e) => e.emailId === emailId)) {
      next[b] = next[b].filter((e) => e.emailId !== emailId);
    }
  }

  // A negative-weight signal is a "this email doesn't belong here" marker.
  // We don't want to store it — just ensure the prior entry was removed,
  // which the pass above already did.
  if (weight <= 0) return next;

  const entry: SignalEntry = { emailId, weight };
  const existing = next[bucket] ?? [];
  const combined = [...existing, entry];

  // FIFO cap — drop oldest entries.
  next[bucket] =
    combined.length > MEMORY_CAP
      ? combined.slice(combined.length - MEMORY_CAP)
      : combined;

  return next;
}
