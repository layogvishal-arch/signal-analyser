# Signal-Adaptive Email Organizer

A support email categorization system that uses **embedding similarity** (not LLM classification) to bucket incoming emails, and silently improves day-over-day by learning from what agents do — **no model retraining**.

> **Live demo:** [signal-analyser.vercel.app](https://signal-analyser.vercel.app)

---

## The Idea

Most AI email tools prompt a model to classify text. That's expensive, slow, and requires retraining to improve. This project demonstrates a different architecture:

- Every bucket has a rich **seed definition** embedded once.
- Every incoming email is embedded and compared via **cosine similarity**.
- As agents override or approve suggestions, their actions get captured as weighted vectors in a per-bucket **signal memory**.
- Future emails are compared against a **blend** of the seed embedding and the confirmed signal memory — so the effective matching target evolves without any model changing.

The result: **day 1 accuracy is modest, day 3+ the system handles edge cases it couldn't before**.

## What this demonstrates (for PM interviews)

1. **Embeddings as the intelligence layer** — not prompt engineering.
2. **Implicit signal loops** — the system learns from what agents *do*, not what they *say*.
3. **Confidence-tiered UX** — auto-categorize, suggest, or stay silent based on certainty.
4. **User override as a first-class input** — not a feedback form, but the primary learning mechanism.
5. **Zero new workflow steps** — the agent reviews and overrides; the AI is invisible infrastructure.

## Architecture

```
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│ Email bank   │──▶│ Pre-computed │──▶│ Zustand store    │
│ (150/bucket) │   │ embeddings   │   │ (signal memory,  │
└──────────────┘   │ (JSON)       │   │  day history)    │
                   └──────────────┘   └────────┬─────────┘
                                               │
                     ┌──────────────────┬──────┴──────┬───────────────┐
                     ▼                  ▼             ▼               ▼
                ┌─────────┐      ┌──────────┐   ┌──────────┐   ┌──────────┐
                │ Scoring │      │ Inbox    │   │ Summary  │   │ PM Debug │
                │ engine  │      │ (3-tier) │   │ (trends) │   │ panel    │
                └─────────┘      └──────────┘   └──────────┘   └──────────┘
```

### Scoring formula

```
final_score     = seed_weight × seed_sim + signal_weight × signal_sim
signal_weight   = min(0.7, n / (n + 20))
seed_weight     = 1 - signal_weight
signal_sim      = max(0, weighted_avg(cos_sim(email, each confirmed email)))
```

### Signal weights

| Event | Weight |
|---|---|
| Auto-categorized, agent does nothing | +0.3 |
| Suggestion approved explicitly | +0.5 |
| Override → correct bucket | +0.8 |
| Override → removed from wrong bucket | −0.4 |
| Manual categorization (silent tier) | +0.6 |

### Confidence tiers

| Score | System action |
|---|---|
| > 0.55 | Auto-categorize |
| 0.35 – 0.55 | Suggest (agent approves or overrides) |
| < 0.35 | Stay silent (agent picks manually) |

> **Calibration note:** The PRD's original thresholds (0.82 / 0.55) assumed embedding similarities that range higher than `text-embedding-3-small` actually produces. After running real data through the system, semantically related emails were landing at ~0.45–0.55 cosine — never crossing the suggest tier. The thresholds above are recalibrated to match the model's real distribution. In production these would be tunable per-bucket and ideally learned from agent override rates.

## Run it locally

```bash
# 1. Clone and install
git clone <repo>
cd signal-adaptive-email-organizer
npm install

# 2. Add your OpenAI key (used only for the one-time embedding generation)
cp .env.local.example .env.local
# edit .env.local and paste OPENAI_API_KEY

# 3. Generate the email bank and its embeddings (one-time; writes data/*.json)
npm run generate

# 4. Start the dev server
npm run dev
# open http://localhost:3000
```

After the generate step, the app runs **entirely offline** — no more API calls.

## Using it

1. Day 1 opens with 25 emails. Most will land in "Needs review" or "Uncategorized" — the system has no signals yet.
2. Approve the suggestions you agree with, override the ones you don't, and pick buckets for the uncategorized.
3. Click **Advance to next day** — 25 fresh emails arrive, scored against everything you just taught the system.
4. Repeat. By Day 3, the "Auto-categorized" section should be visibly larger.
5. Toggle **PM Mode** to see per-email similarity scores, the seed/signal contribution split, and bucket-level weight ratios.
6. Past days are still browseable — changing a past email's bucket replays the signal.

## Interview talking points

- **Why embeddings + signal weights beat fine-tuning:** no training data labels, no retraining, faster iteration, privacy-friendly (signals are vectors, not content).
- **Cold-start tradeoff:** Day 1 is intentionally worse. The system earns trust through measurable improvement, not overclaiming.
- **Confidence thresholds are product choices, calibrated to the model:** the PRD's original `0.82 / 0.55` thresholds had to be lowered to `0.55 / 0.35` once real OpenAI embeddings were plugged in — the model just doesn't produce 0.8+ cosines for natural phrasing variety. Per-bucket thresholds (and learning them from override rates) would be the next step.
- **Scaling:** signal memory is FIFO-capped at 50/bucket in this demo; production would use time-decay or a sliding window. Embedding dim affects latency.
- **Privacy:** the signal loop operates on vectors, not content. Email bodies don't enter the improvement pipeline.

## What's out of scope

- No real email integration (all simulated).
- No LLM calls for classification (pure embedding similarity).
- No fine-tuning / retraining.
- No multi-label categorization.
- No auth / multi-user.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + custom UI primitives (shadcn-style, inlined)
- Zustand with `persist` middleware → `localStorage`
- Recharts for day-over-day trends
- OpenAI `text-embedding-3-small` (used **once** at setup, not at runtime)

## Project layout

```
src/
├── app/                  routes (inbox + summary)
├── components/           UI pieces
│   └── ui/primitives.tsx custom shadcn-style components
├── lib/                  pure logic — embeddings, signals, scoring, metrics
└── store/                Zustand stores
scripts/
├── generate-email-bank.ts   hand-templated emails → data/email-bank.json
└── generate-embeddings.ts   real OpenAI embeddings → data/embeddings.json
data/                     committed JSON so `npm run dev` works offline
```
