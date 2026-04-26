"use client";

// App-wide shell: header with nav links, PM Mode toggle, and the debug panel
// slide-out. The shell renders regardless of route and is a single mount
// point for the store initializer.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Switch } from "@/components/ui/primitives";
import { useSimulation } from "@/store/useSimulation";
import { PMDebugPanel } from "@/components/PMDebugPanel";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Inbox" },
  { href: "/summary", label: "Summary" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pmMode = useSimulation((s) => s.pmMode);
  const setPmMode = useSimulation((s) => s.setPmMode);

  // Wait for Zustand persist to rehydrate from localStorage BEFORE seeding
  // a fresh Day 1. Without this the empty initial state races the rehydrate
  // and overwrites your saved progress on every reload.
  // The persist API is only attached on the client, so we touch it inside
  // useEffect to avoid SSR/hydration errors.
  const initialize = useSimulation((s) => s.initializeIfEmpty);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useSimulation.persist;
    if (!persistApi) {
      // No persist middleware attached — fall through to immediate init.
      setHydrated(true);
      return;
    }
    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return persistApi.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) initialize();
  }, [hydrated, initialize]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-semibold text-sm">
              Signal-Adaptive Email Organizer
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-colors",
                    pathname === item.href
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <span>PM Mode</span>
            <Switch checked={pmMode} onCheckedChange={setPmMode} />
          </label>
        </div>
      </header>

      <main
        className={cn(
          "flex-1 w-full px-6 py-6 transition-all",
          pmMode ? "max-w-none pr-[29rem]" : "max-w-6xl mx-auto"
        )}
      >
        {children}
      </main>

      <PMDebugPanel />
    </div>
  );
}
