// Bucket definitions from the PRD. Each bucket has a rich seed text that captures
// what the bucket means, not just a label. The seed is embedded once at setup
// time and serves as the initial matching target before any signals accumulate.

export type BucketId =
  | "bug"
  | "billing"
  | "appreciation"
  | "feature"
  | "access"
  | "other";

export interface Bucket {
  id: BucketId;
  label: string;
  seed: string;
  // Rough share of incoming email traffic this bucket should receive.
  distribution: number;
}

export const BUCKETS: Bucket[] = [
  {
    id: "bug",
    label: "Bug Report",
    seed: "Customer reporting something broken, not working as expected, error messages, crashes, incorrect behavior, glitches, failures",
    distribution: 0.25,
  },
  {
    id: "billing",
    label: "Billing",
    seed: "Payment issues, invoice questions, refund requests, subscription changes, charges, pricing confusion, plan upgrades",
    distribution: 0.2,
  },
  {
    id: "appreciation",
    label: "Appreciation",
    seed: "Positive feedback, thank you messages, compliments about the product or team, praise, satisfaction",
    distribution: 0.1,
  },
  {
    id: "feature",
    label: "Feature Request",
    seed: "Customer wants something new, suggesting improvements, missing functionality, wishlist items, enhancement ideas",
    distribution: 0.2,
  },
  {
    id: "access",
    label: "Account Access",
    seed: "Login problems, password resets, permissions, account locked, can't access, authentication failures",
    distribution: 0.15,
  },
  {
    id: "other",
    label: "Other",
    seed: "General inquiries, questions that don't fit other categories, miscellaneous requests",
    distribution: 0.1,
  },
];

export const BUCKET_MAP: Record<BucketId, Bucket> = Object.fromEntries(
  BUCKETS.map((b) => [b.id, b])
) as Record<BucketId, Bucket>;
