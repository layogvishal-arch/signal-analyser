# Signal-Adaptive Email Organizer — Implementation Plan

**Overall Progress:** `92%` — build complete, pending your API key to run embeddings + deploy.

## TLDR
A portfolio demo that categorizes support emails using embedding similarity (not LLM classification) and silently improves accuracy day-over-day by learning from agent overrides. Pure Next.js frontend, pre-computed OpenAI embeddings, Zustand + localStorage for state. No backend. Goal: showcase AI PM thinking — embeddings as intelligence, signal loops, confidence-tiered UX.

## Critical Decisions
- **Frontend only** — Next.js 16 + Zustand persist. No DB, no backend. Simulation state lives in localStorage.
- **Pre-computed embeddings** — One-off script generates all vectors via OpenAI `text-embedding-3-small` → `data/embeddings.json`. App runs offline after setup.
- **Signal weight formula** — `signal_weight = min(0.7, n / (n + 20))`, `seed_weight = 1 - signal_weight`.
- **Signal similarity** — weighted avg of cosine similarities, clamped to 0 minimum.
- **Signal memory cap** — 50 per bucket, FIFO.
- **Override weights** — `+0.8 correct / −0.4 wrong` apply to overrides of both auto-categorized AND suggested emails.
- **Historical overrides** — Past days browseable. Edits to past emails feed the signal loop.
- **25 emails/day × 3 days initial, scalable to N days** — Fresh generation per day.
- **Debug panel v1** — Per-email similarity vs all buckets, winner + margin, seed/signal split, tier; system-wide signal counts and weight ratios.
- **Summary** — Dedicated route, no modal triggers.
- **Confidence thresholds (calibrated)** — `auto > 0.55`, `suggest 0.35–0.55`, `silent < 0.35`. PRD's original `0.82 / 0.55` were too high for `text-embedding-3-small`'s actual cosine distribution; recalibrated after observing real Day 1–4 data where semantically related emails plateaued at ~0.45–0.55. Production would tune per-bucket and learn from override rates.

---

## Tasks

### Phase 1 — Scaffold + Embedding Generation
- [x] 🟩 **Step 1: Initialize Next.js project**
  - [x] 🟩 `create-next-app` with TypeScript, Tailwind, App Router, ESLint
  - [x] 🟩 Install Zustand, Recharts, OpenAI SDK, lucide-react, clsx, tailwind-merge, tsx
  - [x] 🟩 Custom inline primitives instead of shadcn CLI (Button, Card, Badge, Select, Switch, Sheet)
  - [x] 🟩 `.env.local.example` created; `.env*` already gitignored
  - [x] 🟩 Folder structure: `src/lib`, `src/components`, `src/store`, `src/app`, `data/`, `scripts/`

- [x] 🟩 **Step 2: Define bucket seeds and email generator**
  - [x] 🟩 `src/lib/buckets.ts` — 6 buckets with seed definitions from PRD
  - [x] 🟩 `scripts/generate-email-bank.ts` — produces 908 emails (~151 per bucket + 8 ambiguous)
  - [x] 🟩 Output: `data/email-bank.json` verified

- [ ] 🟨 **Step 3: Embedding generation script** *(code ready, needs your API key)*
  - [x] 🟩 `scripts/generate-embeddings.ts` — calls OpenAI `text-embedding-3-small`, batched
  - [x] 🟩 npm scripts: `generate:bank`, `generate:embeddings`, `generate`
  - [ ] 🟥 **Run `npm run generate` with your key in `.env.local`** ← YOUR TURN

### Phase 2 — Simulation Engine
- [x] 🟩 **Step 4: Core math utilities**
  - [x] 🟩 `src/lib/similarity.ts` — cosine similarity
  - [x] 🟩 `src/lib/scoring.ts` — `scoreBucket`, `scoreEmail`, `computeSignalWeight`
  - [x] 🟩 `src/lib/tiers.ts` — confidence classification

- [x] 🟩 **Step 5: Signal loop logic**
  - [x] 🟩 `src/lib/signals.ts` — weight table, `applySignal` with FIFO cap + historical-override-safe
  - [x] 🟩 Handles all 5 signal events (implicit, explicit approve, override correct/wrong, manual)

- [x] 🟩 **Step 6: Zustand store with persist**
  - [x] 🟩 `src/store/useSimulation.ts` — days, memory, viewing state, all actions
  - [x] 🟩 Persist middleware → localStorage key `sae-org-state`
  - [x] 🟩 Day generator samples matching PRD distribution, no repeats across days

### Phase 3 — Dashboard UI
- [x] 🟩 **Step 7: Layout + navigation**
  - [x] 🟩 `AppShell` with header, nav (Inbox/Summary), PM Mode toggle
  - [x] 🟩 Inbox route at `/`; day selector + Advance button
  - [x] 🟩 Setup-needed empty state detects missing embeddings

- [x] 🟩 **Step 8: Inbox three-section view**
  - [x] 🟩 `InboxSection` — Auto / Needs Review / Uncategorized with empty-collapse
  - [x] 🟩 `EmailCard` — subject, snippet, tier badge, override dropdown, approve button

### Phase 4 — Analytics + PM Debug Panel + Ship
- [x] 🟩 **Step 9: Summary route**
  - [x] 🟩 `/summary` — per-day stats + per-bucket breakdown cards
  - [x] 🟩 Recharts trend line: auto-rate, override-rate, avg confidence

- [x] 🟩 **Step 10: PM Mode debug panel**
  - [x] 🟩 `PMDebugPanel` slide-in from right
  - [x] 🟩 Per-email: bucket-by-bucket bar chart with seed/signal contribution split
  - [x] 🟩 System-wide: signal counts, weight ratios per bucket

- [ ] 🟨 **Step 11: Polish + README + Deploy**
  - [x] 🟩 README with architecture, formula, talking points, run instructions
  - [x] 🟩 Empty / setup-needed states
  - [x] 🟩 Reset simulation button in header
  - [x] 🟩 Typecheck + `next build` pass cleanly
  - [ ] 🟥 **Run `npm run generate`** ← needs your API key
  - [ ] 🟥 **Push to GitHub + deploy to Vercel** ← after generate works
  - [ ] 🟥 Add live demo URL to README

---

## Out of Scope (explicit)
- No real email integration
- No auth / multi-user
- No LLM calls for classification
- No fine-tuning / retraining
- No multi-label categorization
- No automated confusion-matrix UI
