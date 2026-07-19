---
tags: [changelog, track-a, track-b, track-c, integration, merge]
commit: 179453b → 1e61cf2 (main)
branch: main (all tracks merged)
date: 2026-07-19
---

# All Tracks Merged + Local DB Setup

> [!info] Commits
> `merge: track-a-data into main` · `merge: track-c-frontend into main` · `fix: specificity normalization for nano model + add track-a test scripts`

## What was done

### Track A merged to main
- Gates 0-5 accepted: synthetic corpus (36 profiles), entity resolution, claim extraction, deck ingestion, handoff verification
- All 6 unit test files pass (29 tests)
- Integration pipeline verified against local Postgres: import → entity resolution → claim extraction → verify handoff

### Track B merged to main
- 8 hardening phases + 10 targeted fixes all merged
- 64 unit tests pass, `test:intel` and `test:pipeline` smoke tests pass

### Track C merged to main
- 6 pages: Landing, Dashboard, Pipeline, Founder Profile, Investment Memo, Intake, Settings
- 10 shared components: AppLayout, Sidebar, ScoreBand, Tag, Dialog, TrendArrow, ScatterChart, RadarChart, SignalCard, DimensionCard
- Classical design system: Space Grotesk + Lora, Cream/Rust/Orange palette, full CSS token system

### Local database setup
- Docker container `argus-postgres` on `localhost:51214`
- `.env` updated with local Postgres URL
- Prisma schema pushed, baseline seeded
- Synthetic corpus imported and verified

### Bug fix
- `lib/contracts.ts`: `extractedClaimSchema.specificity` changed from `z.enum()` to `z.string().transform()` — normalizes `gpt-4.1-nano` output (returns values like "Very High" instead of "high")

### npm scripts added
- `test:track-a` — 29 unit tests (no DB, $0)
- `test:track-a:import` — import corpus
- `test:track-a:resolve` — entity resolution
- `test:track-a:extract` — claim extraction
- `test:track-a:verify` — verify handoff

## Files changed
- `lib/contracts.ts` — specificity normalization
- `package.json` — 5 new npm scripts
- `brain/` — all documentation updated

## Current state
- **93 tests passing** (64 intel + 29 track-a)
- tsc clean, lint clean, build passes
- All 3 tracks on `main`, single trunk
- Docker container running on `localhost:51214`

## Still needed
- Adaption Labs spike (needs `ADAPTION_API_KEY`)
- `/debug` ReasoningLog viewer (nice-to-have)
- Demo rehearsal + slides
