"use client";

// Summary route — per-day stats and day-over-day trends. This is where the
// day-over-day improvement becomes visible. An agent can come here any time;
// there's no modal trigger.

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useSimulation } from "@/store/useSimulation";
import { BUCKETS, BUCKET_MAP } from "@/lib/buckets";
import { computeAllMetrics } from "@/lib/metrics";
import { Card, CardContent, CardHeader, SectionTitle } from "@/components/ui/primitives";

export default function SummaryPage() {
  const days = useSimulation((s) => s.days);
  const metrics = useMemo(() => computeAllMetrics(days), [days]);

  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">No days simulated yet.</p>;
  }

  // Chart data: one row per day.
  const chartData = metrics.map((m) => ({
    day: `Day ${m.dayNumber}`,
    autoRate: Math.round(m.autoRate * 100),
    overrideRate: Math.round(m.overrideRate * 100),
    avgConfidence: Number((m.avgConfidence * 100).toFixed(1)),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Summary</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Day-over-day metrics. Auto-rate should climb; override-rate should fall.
        </p>
      </div>

      {/* Day-over-day chart */}
      <Card>
        <CardHeader>
          <SectionTitle>Day-over-day trends</SectionTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="autoRate" stroke="#059669" name="Auto-rate %" strokeWidth={2} />
                <Line type="monotone" dataKey="overrideRate" stroke="#dc2626" name="Override-rate %" strokeWidth={2} />
                <Line type="monotone" dataKey="avgConfidence" stroke="#2563eb" name="Avg confidence ×100" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-day cards */}
      <section className="space-y-3">
        <SectionTitle>Per-day breakdown</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((m) => (
            <Card key={m.dayNumber}>
              <CardHeader>
                <h3 className="font-semibold text-sm">Day {m.dayNumber}</h3>
                <span className="text-xs text-muted-foreground">{m.total} emails</span>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Auto-categorized</dt>
                  <dd className="text-right">{m.autoCount} ({Math.round(m.autoRate * 100)}%)</dd>
                  <dt className="text-muted-foreground">Approved</dt>
                  <dd className="text-right">{m.suggestedApproved}</dd>
                  <dt className="text-muted-foreground">Suggested but overridden</dt>
                  <dd className="text-right text-amber-700">{m.suggestedOverridden}</dd>
                  <dt className="text-muted-foreground">Manual</dt>
                  <dd className="text-right">{m.manualCount}</dd>
                  <dt className="text-muted-foreground">Avg confidence</dt>
                  <dd className="text-right">{m.avgConfidence.toFixed(3)}</dd>
                </dl>
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    By bucket
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {BUCKETS.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px]"
                      >
                        {BUCKET_MAP[b.id].label}
                        <span className="text-muted-foreground">{m.perBucket[b.id]}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
