---
tags: [todo]
updated: 2026-07-19
---

# What Is Still Needed

Status rollup in [[main]]. Per-commit history in `changelog/`.

> [!danger] Blockers (user/team action)
> - [x] ~~Create Neon Postgres~~ ✅ live, schema pushed, seeded
> - [x] ~~Share `DATABASE_URL` + `OPENAI_API_KEY` with teammates~~ ✅ local Postgres running at `localhost:51214`
> - [x] ~~Connect repo to Vercel~~ ✅ live, prod tracks `main`
> - [x] ~~Track C teammate starts~~ ✅ done — 6 pages, 10 components, Classical design system

## Track B — Intelligence ([[tracks/track-b-intelligence]])

- [x] LLM wrapper with cache + traceability log
- [x] Founder Score engine (bands via self-consistency)
- [x] Visibility Index + capability−visibility gap
- [x] Screen · 3-axis scoring · Validator · Playbook · Delta updates
- [x] Adversarial pass + memo generator
- [x] Ambition & Drive read + research doc
- [x] Pipeline orchestrator (DB-free)
- [x] Persistence layer (`lib/persist.ts`)
- [x] All 9 API routes (interview loop, intake, NL query, streaming memo, outbound scan)
- [x] Live route testing — full pipeline verified against Neon
- [x] Hardening: 8 phases (unit tests, pipeline resilience, prompt refinement, coverage formula, delta sophistication, memo quality, ScoreHistory enrichment, full verification)
- [x] 10 targeted fixes (null safety, retry logic, truncation suffix, batched writes, etc.)

## Track A — Data & Memory ([[tracks/track-a-data]])

- [x] Synthetic corpus: 36 profiles across the capability×visibility grid
- [x] Entity resolution (email auto-link, handle auto-link, review routing, ambiguity detection)
- [x] Claim extraction (grounded, verbatim validation, dedup)
- [x] Corpus importer (idempotent, collision-checked, append-only protection)
- [x] Deck ingestion (PDF → JSON, schema validation, idempotent reuse)
- [x] Handoff verification (Gate 5 — all 4 demo profiles verified)
- [x] Integration verified against local Postgres with synthetic data
- [ ] Adaption Labs spike (needs `ADAPTION_API_KEY`)
- [ ] Fetchers: GitHub first (stretch gate)

## Track C — Experience ([[tracks/track-c-experience]])

- [x] Thesis config screen (`/settings`)
- [x] Discovery dashboard: scatter + pipeline table (`/dashboard`)
- [x] Founder profile: radar, dimensions, signals, dialogs (`/founders/[id]`)
- [x] Memo view — streaming typewriter effect (`/opportunities/[id]/memo`)
- [x] Intake form — drag-and-drop deck upload (`/intake`)
- [x] Pipeline table — sortable/filterable (`/pipeline`)
- [x] Landing page (`/`)
- [x] Classical design system (CSS tokens, component classes)
- [x] 10 shared components
- [ ] `/debug` ReasoningLog viewer (nice-to-have, not required)

## Demo prep (hours 21-24, nothing new after 21)

- [x] Pre-compute full corpus through pipeline
- [ ] Rehearse [[demo-script]]
- [ ] Slides
