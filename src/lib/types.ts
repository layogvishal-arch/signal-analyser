import type { BucketId } from "./buckets";
import type { ScoredEmail } from "./scoring";
import type { ConfidenceTier } from "./tiers";

// Status tracks what the agent has done with an email so the UI and the
// signal loop stay in sync.
export type EmailStatus =
  | "pending"        // system placed it in a tier; agent hasn't acted
  | "approved"       // agent explicitly approved a suggestion
  | "overridden"    // agent changed the bucket
  | "manual"         // agent picked from silent tier
  | "auto-left";     // agent advanced day and left an auto-categorized email

export interface ProcessedEmail {
  id: string;              // stable id from the email bank
  subject: string;
  body: string;
  trueBucket: BucketId;    // ground truth, hidden from the agent UI
  ambiguous: boolean;

  // Result of scoring at the moment this email was processed. Frozen — it
  // reflects the system state when the day started, not current state.
  initialScore: ScoredEmail;
  initialTier: ConfidenceTier;

  // Current bucket assignment. Starts as the initial winner, can be changed
  // by the agent via override/approve/manual.
  assignedBucket: BucketId | null;   // null when silent and not yet manual
  status: EmailStatus;
}

export interface EmailDay {
  dayNumber: number;
  emails: ProcessedEmail[];
  generatedAt: string; // ISO timestamp
}

export interface DayMetrics {
  dayNumber: number;
  total: number;
  autoCount: number;
  suggestedApproved: number;
  suggestedOverridden: number;
  manualCount: number;
  overrideRate: number;     // overrides / total
  autoRate: number;         // auto / total
  avgConfidence: number;
  perBucket: Record<BucketId, number>;
}
