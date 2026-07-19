---
tags: [todo]
updated: 2026-07-19
---

# What Is Still Needed

Status rollup in [[main]]. Per-commit history in `changelog/`.

> [!danger] Blockers (user/team action)
> - [x] ~~Create Neon Postgres~~ ✅ live, schema pushed, seeded
> - [ ] **Share `DATABASE_URL` + `OPENAI_API_KEY` with teammates privately** (Track A Gate 4 importer needs the DB)
> - [x] ~~Connect repo to Vercel~~ ✅ live, prod tracks `main`
> - [ ] Track C teammate starts (all API routes now live for them)

## Track B — Intelligence ([[tracks/track-b-intelligence]])

- [x] LLM wrapper with cache + traceability log
- [x] Founder Score engine (bands via self-consistency)
- [x] Visibility Index + capability−visibility gap
- [x] Screen · 3-axis scoring · Validator · Playbook · Delta updates
- [x] Adversarial pass + memo generator
- [x] Ambition & Drive read + research doc
- [x] Pipeline orchestrator (DB-free)
- [x] Persistence layer written (`lib/persist.ts`) — ⏳ runtime-untested until DB
- [x] API routes written (7 endpoints incl. interview-notes loop, intake, NL query)
- [x] Live route testing — full pipeline, interview loop, returning-founder persistence all verified against Neon
- [x] Interview-notes → Signal → delta-update loop endpoint (`POST /api/founders/[id]/signals`)
- [x] NL query → structured filter endpoint (`POST /api/query`)
- [x] Streaming memo endpoint (`POST /api/opportunities/[id]/memo`, AI SDK streamObject, verified live)
- [x] Outbound scan intake with entity resolution (`POST /api/scan`)

## Track A — Data & Memory ([[tracks/track-a-data]])

- [x] Synthetic corpus: 36 profiles across the capability×visibility grid (Gate 1 ✅, integration-verified)
- [ ] Integration feedback: hidden-gem evidence density + structured visibility meta (see [[tracks/track-a-data]])
- [ ] Adaption Labs spike (their Gate 2; needs `ADAPTION_API_KEY`)
- [ ] Full deck/claim batch (Gate 3) · Postgres importer (Gate 4, needs shared DB)
- [ ] Entity resolution (Gate 5) · runtime extraction fallback (Gate 6)
- [ ] Fetchers: GitHub first (their stretch gate)

## Track C — Experience ([[tracks/track-c-experience]])

- [ ] Thesis config screen
- [ ] Discovery dashboard: capability×visibility scatter (hero) + ranked pipeline table
- [ ] Founder profile: radar with band shading, score timeline, signal feed with trust badges
- [ ] Memo view (streaming)
- [ ] Intake form (deck + company name + optional artifact link)
- [ ] `/debug` ReasoningLog viewer (early — doubles as traceability demo)

## Demo prep (hours 21-24, nothing new after 21)

- [ ] Pre-compute full corpus through pipeline (spend freely)
- [ ] Rehearse [[demo-script]]
- [ ] Slides
