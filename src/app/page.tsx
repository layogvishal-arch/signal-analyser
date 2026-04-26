"use client";

// Inbox route — the primary agent-facing view. Shows three sections based
// on confidence tier, plus controls for browsing past days and advancing
// to the next day.

import { useMemo } from "react";
import { useSimulation } from "@/store/useSimulation";
import { InboxSection } from "@/components/InboxSection";
import { Button, Card, CardContent, Select } from "@/components/ui/primitives";

const EMPTY_EMBEDDINGS_HINT =
  "No embeddings found. Run `npm run generate` once with your OPENAI_API_KEY set in .env.local, then reload.";

export default function InboxPage() {
  const days = useSimulation((s) => s.days);
  const viewingDay = useSimulation((s) => s.viewingDay);
  const currentDay = useSimulation((s) => s.currentDay);
  const setViewingDay = useSimulation((s) => s.setViewingDay);
  const advanceDay = useSimulation((s) => s.advanceDay);
  const reset = useSimulation((s) => s.resetSimulation);

  const day = useMemo(
    () => days.find((d) => d.dayNumber === viewingDay) ?? null,
    [days, viewingDay]
  );

  // Embeddings missing detection — if every seed vector is all zeros (our
  // placeholder file) the first email's scores will all be 0. Show a setup
  // hint instead of a broken categorization UI.
  const firstEmail = day?.emails[0];
  const embeddingsMissing =
    firstEmail && firstEmail.initialScore.scores.every((s) => s.seedSim === 0);

  if (!day || embeddingsMissing) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <Card>
          <CardContent>
            <h1 className="text-lg font-semibold mb-2">Setup needed</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {embeddingsMissing ? EMPTY_EMBEDDINGS_HINT : "Loading simulation..."}
            </p>
            {embeddingsMissing && (
              <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
{`# .env.local
OPENAI_API_KEY=sk-...

# then
npm run generate`}
              </pre>
            )}
            {embeddingsMissing && (
              <Button className="mt-4" variant="outline" onClick={reset}>
                Reset simulation
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const autoEmails = day.emails.filter((e) => e.initialTier === "auto");
  const suggestEmails = day.emails.filter((e) => e.initialTier === "suggest");
  const silentEmails = day.emails.filter((e) => e.initialTier === "silent");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Day {day.dayNumber}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {day.emails.length} emails · generated {new Date(day.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">View day</label>
          <Select
            value={viewingDay}
            onChange={(ev) => setViewingDay(Number(ev.target.value))}
          >
            {days.map((d) => (
              <option key={d.dayNumber} value={d.dayNumber}>
                Day {d.dayNumber}
              </option>
            ))}
          </Select>
          <Button
            variant="primary"
            onClick={advanceDay}
            disabled={viewingDay !== currentDay}
            title={
              viewingDay !== currentDay
                ? "Switch to the latest day to advance"
                : "Generate the next day's batch using current signal memory"
            }
          >
            Advance to next day
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            title="Clear localStorage and start over"
          >
            Reset
          </Button>
        </div>
      </div>

      <InboxSection
        title="Auto-categorized"
        description="High confidence — system handled these. Override if needed."
        emails={autoEmails}
        dayNumber={day.dayNumber}
      />
      <InboxSection
        title="Needs review"
        description="Medium confidence — approve the suggestion or pick a different bucket."
        emails={suggestEmails}
        dayNumber={day.dayNumber}
      />
      <InboxSection
        title="Uncategorized"
        description="Low confidence — system stayed silent. Pick a bucket."
        emails={silentEmails}
        dayNumber={day.dayNumber}
      />
    </div>
  );
}
