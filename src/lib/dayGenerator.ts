// Generates a day's batch of emails by sampling the bank to match the PRD
// distribution, then scoring each one against the CURRENT signal memory.
//
// This is where the day-over-day learning becomes visible: Day 2 scores
// Day 2's emails against memory that was built from Day 1's agent actions,
// so some emails that were "suggest" or "silent" on Day 1 now land in "auto".

import { BUCKETS, type BucketId } from "./buckets";
import { scoreEmail } from "./scoring";
import { classifyConfidence } from "./tiers";
import type { SignalMemory } from "./signals";
import type { ProcessedEmail, EmailDay } from "./types";

interface BankEmail {
  id: string;
  trueBucket: BucketId;
  subject: string;
  body: string;
  ambiguous: boolean;
}

interface EmbeddingsData {
  model: string;
  seeds: Record<BucketId, number[]>;
  emails: Record<string, number[]>;
}

// Target emails per day — kept as a default but overridable per call so
// the simulation can scale.
export const DEFAULT_EMAILS_PER_DAY = 25;

// Sample emails matching the PRD distribution, avoiding IDs already seen.
function sampleByDistribution(
  bank: BankEmail[],
  usedIds: Set<string>,
  count: number,
  seedRng: () => number
): BankEmail[] {
  // Count targets per bucket from the distribution.
  const targets: Record<BucketId, number> = {
    bug: 0, billing: 0, appreciation: 0, feature: 0, access: 0, other: 0,
  };
  let assigned = 0;
  for (const b of BUCKETS) {
    targets[b.id] = Math.round(count * b.distribution);
    assigned += targets[b.id];
  }
  // Rounding may over/undershoot the target count — absorb the delta into
  // "other" so we always emit exactly `count` emails.
  targets.other += count - assigned;

  const available: Record<BucketId, BankEmail[]> = {
    bug: [], billing: [], appreciation: [], feature: [], access: [], other: [],
  };
  for (const e of bank) {
    if (!usedIds.has(e.id)) available[e.trueBucket].push(e);
  }

  // Shuffle each bucket with our seeded RNG (stable across reloads would
  // require persisting the seed; for this demo Math.random is fine).
  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(seedRng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const picked: BankEmail[] = [];
  for (const b of BUCKETS) {
    const pool = shuffle(available[b.id]);
    picked.push(...pool.slice(0, targets[b.id]));
  }

  // Final shuffle so bucket order isn't visible to the agent.
  return shuffle(picked);
}

export interface GenerateDayInput {
  dayNumber: number;
  bank: BankEmail[];
  embeddings: EmbeddingsData;
  memory: SignalMemory;
  usedIds: Set<string>;
  count?: number;
}

export function generateDay(input: GenerateDayInput): EmailDay {
  const count = input.count ?? DEFAULT_EMAILS_PER_DAY;
  const sampled = sampleByDistribution(
    input.bank,
    input.usedIds,
    count,
    Math.random
  );

  const emails: ProcessedEmail[] = sampled.map((e) => {
    const vec = input.embeddings.emails[e.id];
    const score = scoreEmail(
      vec,
      BUCKETS,
      input.embeddings.seeds,
      input.memory,
      input.embeddings.emails
    );
    const tier = classifyConfidence(score.winnerScore);

    return {
      id: e.id,
      subject: e.subject,
      body: e.body,
      trueBucket: e.trueBucket,
      ambiguous: e.ambiguous,
      initialScore: score,
      initialTier: tier,
      // In silent tier the system deliberately doesn't commit to a bucket —
      // the agent must choose. Otherwise pre-populate with the winner.
      assignedBucket: tier === "silent" ? null : score.winner,
      status: "pending",
    };
  });

  return {
    dayNumber: input.dayNumber,
    emails,
    generatedAt: new Date().toISOString(),
  };
}
