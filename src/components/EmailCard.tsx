"use client";

// An individual email in the inbox. Renders the subject, snippet, current
// bucket assignment, and the appropriate action controls based on tier.
// Clicking the card selects it in PM Mode so the debug panel can show
// its detailed score breakdown.

import { useSimulation } from "@/store/useSimulation";
import { BUCKETS, BUCKET_MAP } from "@/lib/buckets";
import type { BucketId } from "@/lib/buckets";
import type { ProcessedEmail } from "@/lib/types";
import { Badge, Button, Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useSelection } from "@/store/useSelection";

interface EmailCardProps {
  email: ProcessedEmail;
  dayNumber: number;
}

function statusLabel(email: ProcessedEmail): { text: string; variant: "success" | "warning" | "secondary" | "outline" } | null {
  switch (email.status) {
    case "approved":
      return { text: "Approved", variant: "success" };
    case "overridden":
      return { text: "Overridden", variant: "warning" };
    case "manual":
      return { text: "Manual", variant: "secondary" };
    case "auto-left":
      return { text: "Auto", variant: "outline" };
    default:
      return null;
  }
}

export function EmailCard({ email, dayNumber }: EmailCardProps) {
  const pmMode = useSimulation((s) => s.pmMode);
  const approveEmail = useSimulation((s) => s.approveEmail);
  const overrideEmail = useSimulation((s) => s.overrideEmail);
  const manualCategorize = useSimulation((s) => s.manualCategorize);

  const selectedId = useSelection((s) => s.selectedEmailId);
  const select = useSelection((s) => s.select);

  const isSelected = selectedId === email.id;
  const tierBadge = {
    auto: <Badge variant="success">Auto</Badge>,
    suggest: <Badge variant="warning">Suggested</Badge>,
    silent: <Badge variant="outline">Low confidence</Badge>,
  }[email.initialTier];

  const statusBadge = statusLabel(email);

  function handleBucketChange(newBucket: BucketId) {
    // Silent tier with no initial assignment = manual categorization.
    // Everything else = override (which works for both auto and suggest tiers).
    if (email.initialTier === "silent" && email.status === "pending") {
      manualCategorize(dayNumber, email.id, newBucket);
    } else {
      overrideEmail(dayNumber, email.id, newBucket);
    }
  }

  return (
    <div
      className={cn(
        "border rounded-lg px-4 py-3 transition-all bg-card",
        isSelected
          ? "border-primary shadow-sm"
          : "border-border hover:border-muted-foreground/40"
      )}
      onClick={() => pmMode && select(email.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {tierBadge}
            {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>}
            {email.ambiguous && pmMode && (
              <Badge variant="outline" className="text-[10px]">ambiguous</Badge>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              score {email.initialScore.winnerScore.toFixed(3)}
            </span>
          </div>
          <h3 className="font-medium text-sm mt-1.5 truncate">{email.subject}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.body}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <label className="text-[11px] text-muted-foreground">Bucket</label>
        <Select
          value={email.assignedBucket ?? ""}
          onChange={(ev) => handleBucketChange(ev.target.value as BucketId)}
          onClick={(ev) => ev.stopPropagation()}
        >
          {email.assignedBucket === null && <option value="">— pick one —</option>}
          {BUCKETS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </Select>

        {email.initialTier === "suggest" && email.status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={(ev) => {
              ev.stopPropagation();
              approveEmail(dayNumber, email.id);
            }}
          >
            Approve suggestion
          </Button>
        )}

        {email.assignedBucket && (
          <span className="text-[11px] text-muted-foreground ml-auto">
            {BUCKET_MAP[email.assignedBucket].label}
          </span>
        )}
      </div>
    </div>
  );
}
