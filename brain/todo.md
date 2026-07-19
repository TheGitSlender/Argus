---
tags: [todo]
updated: 2026-07-19
---

# What Is Still Needed

Status rollup in [[main]]. Per-commit history in `changelog/`.

> [!danger] Blockers (user/team action)
> - [ ] **Create Neon Postgres** and share `DATABASE_URL` — blocks persistence, routes, seeding, ReasoningLog
> - [ ] **Connect repo to Vercel** — deploy from hour 1, not hour 22
> - [ ] Teammates pull repo, read `TEAM.md`, start Tracks A & C

## Track B — Intelligence ([[tracks/track-b-intelligence]])

- [x] LLM wrapper with cache + traceability log
- [x] Founder Score engine (bands via self-consistency)
- [x] Visibility Index + capability−visibility gap
- [x] Screen · 3-axis scoring · Validator · Playbook · Delta updates
- [x] Adversarial pass + memo generator
- [x] Ambition & Drive read + research doc
- [x] Pipeline orchestrator (DB-free)
- [ ] **Persistence layer**: save FounderScore, append ScoreHistory, update Claims from validations, store memo — ⏳ blocked on DB
- [ ] **API routes / server actions** per stage for Track C — ⏳ blocked on DB
- [ ] Streaming memo endpoint (demo polish)
- [ ] Interview-notes → Signal → delta-update → bands-narrow loop endpoint (demo beat #5)
- [ ] NL query → structured filter endpoint (cut-first list)
- [ ] Founder Score persistence demo (re-application carries score over)

## Track A — Data & Memory ([[tracks/track-a-data]])

- [ ] Adaption Labs hour-0 spike (upload → estimate → run → download, record credit burn)
- [ ] Fetchers: GitHub · HN Algolia · Devpost · arXiv · Product Hunt
- [ ] Deck text extraction (`unpdf`) + claim extraction into Signal/Claim
- [ ] Synthetic corpus: 30-40 profiles across the capability×visibility grid (one owner!)
- [ ] Entity resolution / dedup population of Identity
- [ ] Corpus quality metrics surfaced from Adaption eval

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
