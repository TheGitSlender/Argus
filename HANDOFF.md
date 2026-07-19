# ARGUS — Application Handoff

> Complete structural reference. Prod: https://argus-one-ruby.vercel.app
> Demo/pitch material: `DEMO_HANDOFF.md` · Project memory: `brain/` (open in Obsidian) · Compliance audit: `brain/objectives-audit.md`

## What it is

An AI-first VC operating system (Hack-Nation Challenge 02, Maschmeyer Group) covering **Sourcing → Screening → Diligence → Decision**. Core thesis: **capability ≠ visibility** — popularity signals are measured separately from ability and never inflate it; founders are ranked by evidence quality, with the capability−visibility **gap** surfacing hidden gems.

**Stack:** Next.js 16 (App Router) · TypeScript · Prisma 6 + Postgres (Neon) · OpenAI gpt-4.1 family via one wrapper (`OPENAI_BASE_URL` swaps in any OpenAI-compatible/open-source endpoint) · Tailwind + custom design system · Vercel.

## Directory map

```
app/
  api/                      # 13 route handlers (see API surface)
  dashboard/  pipeline/     # list views: scatter hero, ranked table, NL query bar
  founders/[id]/            # profile: radar bands, score timeline, signals, trust badges
  opportunities/[id]/memo/  # memo view (streaming generation)
  sourcing/                 # outbound pool, channel-quality card, activation drafts
  intake/  settings/  debug/ # application form · thesis config · ReasoningLog viewer
  components/               # Sidebar, ScatterChart, RadarChart, ScoreBand, …
lib/
  contracts.ts              # FROZEN zod contracts between all pipeline stages
  llm.ts                    # THE LLM wrapper: cache → call → validate → ReasoningLog
  db.ts  persist.ts         # Prisma client · the only intelligence↔DB bridge
  thesis-fit.ts             # graded sector/geo fit for list views
  intel/                    # the intelligence layer (DB-free, EvidenceBundle in → typed out)
    evidence.ts             #   bundle shape, prompt rendering, coverage metric, leak sanitizers
    band-math.ts            #   pure band arithmetic (median, spread, coverage widening)
    visibility.ts           #   deterministic Visibility Index + prose count parser
    prompts.ts              #   ALL prompt text (rubrics, guardrails, decision rules)
    founder-score.ts        #   5 dims × 3-sample self-consistency → bands
    stages.ts               #   extract, screen, ambition read, axes, validator, playbook, delta, NL query
    memo.ts  pipeline.ts    #   adversarial + memo assembly · full-run orchestrator
  sourcing/                 # outbound: github.ts scanner, intake.ts, rank.ts, outreach.ts, keywords.ts
prisma/schema.prisma        # 12 models (see data model); seed.ts (guarded vs shared DB)
scripts/                    # operational tooling (below); track-a/ = corpus + importer + entity resolution
data/track-a/profiles.jsonl # 36-profile synthetic corpus (archetype-engineered)
brain/                      # Obsidian vault: architecture, decisions, 16-entry changelog, audit
docs/                       # research (founder predictors) + track-a process docs
```

## Data model (Prisma)

`Founder` (context = resourcefulness denominator) → `FounderScore` (5 band JSONs + visibilityIndex + gap + ambitionRead) · `ScoreHistory` **append-only** (band changes + causeSignal) · `Identity` (entity resolution, source+handle unique) · `Company` → `Opportunity` (track INBOUND/OUTBOUND, status funnel, decision, firstSignalAt/decidedAt timer, memo JSON) ←→ founders m-n · `Signal` (raw evidence, source-tagged, nothing discarded) → `Claim` (per-claim trustScore + verificationStatus) · `AxisScore` (3 per opportunity, never averaged) · `InterviewQuestion` (playbook) · `Thesis` (configurable lens) · `ReasoningLog` **append-only** (every LLM call; doubles as cache) · `Outreach` (draft-only activation funnel).

## Intelligence pipeline (per opportunity)

extract claims (nano) → permissive screen (nano) → [founder score 5×3 samples ∥ ambition read ∥ claim validation] (mini) → [3 axes ∥ interview playbook] → adversarial bear case → memo w/ decision + gaps + timer (gpt-4.1). Bands = sample spread widened by evidence coverage; delta updates adjust bands on each new signal.

## API surface

| Route | Purpose |
|---|---|
| POST `/api/apply` | Inbound intake (deck+company min; GitHub-handle convergence) |
| POST `/api/scan` | Outbound intake (single founder payload) |
| POST `/api/sourcing/scan` | Run scanners (GitHub live) + rank |
| GET `/api/sourcing` | Ranked pool + funnel stats + channel quality |
| POST `/api/sourcing/[id]/activate` | Generate outreach DRAFT (nothing sends) |
| POST `/api/opportunities/[id]/run` | Full pipeline + persist |
| GET/POST `/api/opportunities/[id]/memo` | Fetch one / stream-generate memo |
| GET `/api/opportunities` | Slim list (CDN-cached 30s) |
| GET `/api/founders/[id]` | Full profile payload |
| POST `/api/founders/[id]/signals` | Ingest signal → delta update (interview loop) |
| POST `/api/query` | NL → structured filter |
| GET/POST `/api/thesis` | Fund lens |
| GET `/api/debug/reasoning` | Traceability rows + cost aggregate |

## Scripts

`run-scan.ts` (live GitHub sourcing) · `batch-score.ts [--all]` (pipeline over unscored founders) · `enrich-corpus.ts` (coverage enrichment via delta pipeline) · `simulate-timeline.ts` (seeded demo timeline) · `test-intel/pipeline/memo/unit.ts` (93 tests: `npm run test:unit`, `npm run test:track-a`) · `track-a/*` (corpus validate/import/entity-resolution).

## Env

`DATABASE_URL` (Neon) · `OPENAI_API_KEY` · optional `OPENAI_BASE_URL`, `MODEL_EXTRACT/SCORE/HEAVY`, `GITHUB_TOKEN` (scopeless, rate limits only).

## Invariants (do not break)

Every LLM call through `runLLM()` · `ScoreHistory`/`ReasoningLog` append-only · visibility never feeds capability · axes never averaged · gaps flagged, never fabricated · outreach draft-only · `lib/contracts.ts` + schema changes announced before merging.
