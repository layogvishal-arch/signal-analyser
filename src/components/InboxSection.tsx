"use client";

// A named group of emails within the inbox: Auto, Needs Review, or
// Uncategorized. Empty sections collapse gracefully so Day 1 (heavy in
// silent/suggest) and later days (heavy in auto) both look intentional.

import { EmailCard } from "@/components/EmailCard";
import { SectionTitle } from "@/components/ui/primitives";
import type { ProcessedEmail } from "@/lib/types";

interface Props {
  title: string;
  description: string;
  emails: ProcessedEmail[];
  dayNumber: number;
}

export function InboxSection({ title, description, emails, dayNumber }: Props) {
  if (emails.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <SectionTitle>{title}</SectionTitle>
        <span className="text-xs text-muted-foreground">{emails.length}</span>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">{description}</p>
      <div className="space-y-2">
        {emails.map((e) => (
          <EmailCard key={e.id} email={e} dayNumber={dayNumber} />
        ))}
      </div>
    </section>
  );
}
