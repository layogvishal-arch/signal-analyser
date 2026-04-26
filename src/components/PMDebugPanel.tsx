"use client";

// PM Mode slide-in panel. Two sections:
//   1. Per-email detail (when an email is selected): similarity score vs
//      every bucket, winner + margin, and the seed/signal contribution split.
//      This is the "why did the system decide this" view.
//   2. System-wide: signal memory sizes, current seed/signal weight ratios,
//      and day-over-day trends. This is the "how much has the system learned"
//      view.

import { useMemo } from "react";
import { useSimulation } from "@/store/useSimulation";
import { useSelection } from "@/store/useSelection";
import { BUCKETS, BUCKET_MAP } from "@/lib/buckets";
import { computeSignalWeight } from "@/lib/scoring";
import { Sheet, SectionTitle, Badge, Button } from "@/components/ui/primitives";
import { TIER_AUTO, TIER_SUGGEST } from "@/lib/tiers";

export function PMDebugPanel() {
  const open = useSimulation((s) => s.pmMode);
  const setOpen = useSimulation((s) => s.setPmMode);
  const days = useSimulation((s) => s.days);
  const memory = useSimulation((s) => s.memory);
  const selectedId = useSelection((s) => s.selectedEmailId);

  const selectedEmail = useMemo(() => {
    if (!selectedId) return null;
    for (const d of days) {
      const e = d.emails.find((x) => x.id === selectedId);
      if (e) return { email: e, dayNumber: d.dayNumber };
    }
    return null;
  }, [days, selectedId]);

  return (
    <Sheet open={open} width="28rem">
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
        <div>
          <h2 className="font-semibold text-sm">PM / Debug panel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            See why the system decided what it decided.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Per-email section */}
        <section>
          <SectionTitle>Selected email</SectionTitle>
          {!selectedEmail ? (
            <p className="text-xs text-muted-foreground mt-2">
              Click any email in the inbox to see its score breakdown.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Day {selectedEmail.dayNumber} · true bucket:{" "}
                  <span className="text-foreground font-medium">
                    {BUCKET_MAP[selectedEmail.email.trueBucket].label}
                  </span>
                </p>
                <p className="text-sm font-medium mt-1">{selectedEmail.email.subject}</p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Badge variant="outline">tier: {selectedEmail.email.initialTier}</Badge>
                <span className="text-muted-foreground">
                  winner score {selectedEmail.email.initialScore.winnerScore.toFixed(4)}
                </span>
                <span className="text-muted-foreground">
                  margin {selectedEmail.email.initialScore.margin.toFixed(4)}
                </span>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  Score vs. each bucket
                </p>
                <div className="space-y-1.5">
                  {[...selectedEmail.email.initialScore.scores]
                    .sort((a, b) => b.finalScore - a.finalScore)
                    .map((s) => (
                      <div key={s.bucketId}>
                        <div className="flex items-center justify-between text-xs">
                          <span>
                            {BUCKET_MAP[s.bucketId].label}{" "}
                            {s.bucketId === selectedEmail.email.initialScore.winner && (
                              <span className="text-emerald-600">← winner</span>
                            )}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {s.finalScore.toFixed(4)}
                          </span>
                        </div>
                        {/* Horizontal bar showing seed contribution + signal contribution */}
                        <div className="relative h-1.5 bg-muted rounded overflow-hidden mt-0.5">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-400"
                            style={{
                              width: `${Math.max(0, s.seedWeight * s.seedSim * 100)}%`,
                            }}
                            title={`seed: w=${s.seedWeight.toFixed(2)}, sim=${s.seedSim.toFixed(3)}`}
                          />
                          <div
                            className="absolute inset-y-0 bg-emerald-500"
                            style={{
                              left: `${Math.max(0, s.seedWeight * s.seedSim * 100)}%`,
                              width: `${Math.max(0, s.signalWeight * s.signalSim * 100)}%`,
                            }}
                            title={`signal: w=${s.signalWeight.toFixed(2)}, sim=${s.signalSim.toFixed(3)}`}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                          <span>
                            seed w={s.seedWeight.toFixed(2)} sim={s.seedSim.toFixed(3)}
                          </span>
                          <span>
                            signal w={s.signalWeight.toFixed(2)} sim={s.signalSim.toFixed(3)} · n={s.signalCount}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  <span className="inline-block w-2 h-2 bg-blue-400 mr-1 align-middle" /> seed ·{" "}
                  <span className="inline-block w-2 h-2 bg-emerald-500 mx-1 align-middle" /> signal
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
                Tier cutoffs: auto &gt; {TIER_AUTO} · suggest ≥ {TIER_SUGGEST}
              </div>
            </div>
          )}
        </section>

        {/* System-wide section */}
        <section>
          <SectionTitle>System state</SectionTitle>
          <div className="mt-2 space-y-3">
            {BUCKETS.map((b) => {
              const n = memory[b.id].length;
              const sw = computeSignalWeight(n);
              return (
                <div key={b.id} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{b.label}</span>
                    <span className="font-mono text-muted-foreground">
                      n={n} · seed={(1 - sw).toFixed(2)} / signal={sw.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded overflow-hidden mt-1">
                    <div className="absolute inset-y-0 left-0 bg-blue-400" style={{ width: `${(1 - sw) * 100}%` }} />
                    <div className="absolute inset-y-0 bg-emerald-500" style={{ left: `${(1 - sw) * 100}%`, width: `${sw * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Formula: <code>signal_weight = min(0.7, n / (n + 20))</code>. As signals accumulate per bucket, the system relies more on learned patterns and less on the seed definition.
          </p>
        </section>
      </div>
    </Sheet>
  );
}
