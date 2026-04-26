// Central simulation store. Holds all days, the signal memory, and the
// currently-viewed day. Persisted to localStorage so refresh preserves
// your progress — essential for a multi-day simulation.
//
// The store exposes agent actions (approve, override, manual) and a day
// advancer. Every action that changes an email's bucket also dispatches
// the appropriate signal into memory.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BUCKETS, BUCKET_MAP, type BucketId } from "@/lib/buckets";
import { generateDay, DEFAULT_EMAILS_PER_DAY } from "@/lib/dayGenerator";
import {
  applySignal,
  emptyMemory,
  SIGNAL_WEIGHTS,
  type SignalMemory,
} from "@/lib/signals";
import { scoreEmail } from "@/lib/scoring";
import { classifyConfidence } from "@/lib/tiers";
import type { EmailDay, ProcessedEmail } from "@/lib/types";
import embeddingsRaw from "../../data/embeddings.json";
import bankRaw from "../../data/email-bank.json";

// Typed wrappers around the JSON files. These imports are resolved at build
// time so the app ships without any runtime fetch or API call.
const embeddings = embeddingsRaw as unknown as {
  model: string;
  seeds: Record<BucketId, number[]>;
  emails: Record<string, number[]>;
};
const bank = bankRaw as Array<{
  id: string;
  trueBucket: BucketId;
  subject: string;
  body: string;
  ambiguous: boolean;
}>;

interface SimulationState {
  days: EmailDay[];
  currentDay: number;           // 1-indexed; always the latest day present
  viewingDay: number;           // which day the agent is looking at
  memory: SignalMemory;
  emailsPerDay: number;
  pmMode: boolean;              // session-only toggle, still in store for simplicity

  // Actions
  initializeIfEmpty: () => void;
  advanceDay: () => void;
  approveEmail: (dayNumber: number, emailId: string) => void;
  overrideEmail: (dayNumber: number, emailId: string, newBucket: BucketId) => void;
  manualCategorize: (dayNumber: number, emailId: string, bucket: BucketId) => void;
  setViewingDay: (n: number) => void;
  setPmMode: (on: boolean) => void;
  resetSimulation: () => void;
}

// Collect all email IDs that already appeared in any day so the generator
// avoids repeats across days.
function collectUsedIds(days: EmailDay[]): Set<string> {
  const s = new Set<string>();
  for (const d of days) for (const e of d.emails) s.add(e.id);
  return s;
}

// Find and replace an email across the days array (immutable update).
function updateEmail(
  days: EmailDay[],
  dayNumber: number,
  emailId: string,
  updater: (e: ProcessedEmail) => ProcessedEmail
): EmailDay[] {
  return days.map((d) =>
    d.dayNumber !== dayNumber
      ? d
      : { ...d, emails: d.emails.map((e) => (e.id === emailId ? updater(e) : e)) }
  );
}

export const useSimulation = create<SimulationState>()(
  persist(
    (set, get) => ({
      days: [],
      currentDay: 0,
      viewingDay: 1,
      memory: emptyMemory(),
      emailsPerDay: DEFAULT_EMAILS_PER_DAY,
      pmMode: false,

      initializeIfEmpty: () => {
        if (get().days.length > 0) return;
        const day = generateDay({
          dayNumber: 1,
          bank,
          embeddings,
          memory: emptyMemory(),
          usedIds: new Set(),
          count: get().emailsPerDay,
        });
        set({ days: [day], currentDay: 1, viewingDay: 1 });
      },

      advanceDay: () => {
        const { days, memory, emailsPerDay } = get();

        // Before generating the next day, promote any "pending" emails on
        // the current day to their final state so their signals are counted.
        // - Pending auto → implicit approve (weight 0.3)
        // - Pending suggest → leave as pending-no-action (no signal; the
        //   agent explicitly did NOT confirm, so we stay silent)
        // - Pending silent → stay pending (agent didn't categorize; no signal)
        let nextMemory = memory;
        const currentDayNumber = days[days.length - 1].dayNumber;
        const updatedDays = days.map((d) => {
          if (d.dayNumber !== currentDayNumber) return d;
          const updatedEmails = d.emails.map((e) => {
            if (e.status !== "pending") return e;
            if (e.initialTier === "auto" && e.assignedBucket) {
              const vec = embeddings.emails[e.id];
              nextMemory = applySignal(
                nextMemory,
                e.assignedBucket,
                e.id,
                vec,
                SIGNAL_WEIGHTS.implicitApprove
              );
              return { ...e, status: "auto-left" as const };
            }
            return e;
          });
          return { ...d, emails: updatedEmails };
        });

        const usedIds = collectUsedIds(updatedDays);
        const nextDay = generateDay({
          dayNumber: currentDayNumber + 1,
          bank,
          embeddings,
          memory: nextMemory,
          usedIds,
          count: emailsPerDay,
        });

        set({
          days: [...updatedDays, nextDay],
          memory: nextMemory,
          currentDay: currentDayNumber + 1,
          viewingDay: currentDayNumber + 1,
        });
      },

      approveEmail: (dayNumber, emailId) => {
        const { days, memory } = get();
        const day = days.find((d) => d.dayNumber === dayNumber);
        const email = day?.emails.find((e) => e.id === emailId);
        if (!email || !email.assignedBucket) return;

        const vec = embeddings.emails[emailId];
        const nextMemory = applySignal(
          memory,
          email.assignedBucket,
          emailId,
          vec,
          SIGNAL_WEIGHTS.explicitApprove
        );

        const nextDays = updateEmail(days, dayNumber, emailId, (e) => ({
          ...e,
          status: "approved",
        }));

        set({ days: nextDays, memory: nextMemory });
      },

      overrideEmail: (dayNumber, emailId, newBucket) => {
        const { days, memory } = get();
        const day = days.find((d) => d.dayNumber === dayNumber);
        const email = day?.emails.find((e) => e.id === emailId);
        if (!email) return;

        const vec = embeddings.emails[emailId];
        const oldBucket = email.assignedBucket;

        let nextMemory = memory;
        // First remove / negatively-signal the wrong bucket (if any).
        if (oldBucket && oldBucket !== newBucket) {
          nextMemory = applySignal(
            nextMemory,
            oldBucket,
            emailId,
            vec,
            SIGNAL_WEIGHTS.overrideWrong
          );
        }
        // Then add a strong positive signal to the new bucket.
        nextMemory = applySignal(
          nextMemory,
          newBucket,
          emailId,
          vec,
          SIGNAL_WEIGHTS.overrideCorrect
        );

        const nextDays = updateEmail(days, dayNumber, emailId, (e) => ({
          ...e,
          assignedBucket: newBucket,
          status: "overridden",
        }));

        set({ days: nextDays, memory: nextMemory });
      },

      manualCategorize: (dayNumber, emailId, bucket) => {
        const { days, memory } = get();
        const day = days.find((d) => d.dayNumber === dayNumber);
        const email = day?.emails.find((e) => e.id === emailId);
        if (!email) return;

        const vec = embeddings.emails[emailId];
        const nextMemory = applySignal(
          memory,
          bucket,
          emailId,
          vec,
          SIGNAL_WEIGHTS.manualCategorize
        );

        const nextDays = updateEmail(days, dayNumber, emailId, (e) => ({
          ...e,
          assignedBucket: bucket,
          status: "manual",
        }));

        set({ days: nextDays, memory: nextMemory });
      },

      setViewingDay: (n) => set({ viewingDay: n }),
      setPmMode: (on) => set({ pmMode: on }),

      resetSimulation: () => {
        set({
          days: [],
          currentDay: 0,
          viewingDay: 1,
          memory: emptyMemory(),
          pmMode: false,
        });
      },
    }),
    {
      name: "sae-org-state",
      storage: createJSONStorage(() => localStorage),
      // Don't persist pmMode — it's session-scoped.
      partialize: (state) => ({
        days: state.days,
        currentDay: state.currentDay,
        viewingDay: state.viewingDay,
        memory: state.memory,
        emailsPerDay: state.emailsPerDay,
      }),
    }
  )
);

// Re-export for convenience in components.
export { BUCKETS, BUCKET_MAP };
