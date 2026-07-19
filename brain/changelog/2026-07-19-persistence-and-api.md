---
tags: [changelog, track-b]
commit: pending-push
branch: track-b-intel
date: 2026-07-19
---

# Persistence Layer + API Routes

> [!info] Commit
> `feat: persistence layer + API routes (pipeline runner, signal ingestion loop, intake, NL query, thesis)` · branch `track-b-intel` · written DB-blind (typecheck + `next build` verified); runtime testing awaits the Neon `DATABASE_URL`.

## What was done

- **`lib/persist.ts`** — the only place intelligence results touch Prisma: `assembleBundle` (Founder + Signals + Claims → EvidenceBundle), `saveFounderScore` (upsert snapshot + per-dimension ScoreHistory append), `applyDeltaUpdates` (targeted band moves + composite/gap recompute + history), `saveAxisScores`, `applyValidations` (trust fields onto Claims), `savePlaybook`, `saveMemo` (decision enum + `decidedAt`).
- **New stages**: `extractClaims` (stage 1, gpt-4.1-nano) and `nlQueryToFilter` (NL query bar) in `lib/intel/stages.ts` + prompts.
- **7 API routes** (Next 16 App Router, all build-verified):

| Route | Purpose |
|---|---|
| `POST /api/opportunities/[id]/run` | Full pipeline + persist everything (maxDuration 300s) |
| `POST /api/founders/[id]/signals` | **The living-profile loop**: new signal → claims → delta update → bands move (interview notes use source INTERVIEW — demo beat 5) |
| `GET /api/founders/[id]` | Full profile payload for Track C |
| `POST /api/apply` | Inbound intake (deck + company min bar, optional artifact link, returning-founder score persistence per FAQ 6) |
| `POST /api/query` | NL → structured filter |
| `GET /api/opportunities` | Dashboard list w/ scores + axes |
| `GET/POST /api/thesis` | Configurable fund lens |

## Also this session

Merged `track-b-intel` + `track-a-data` + `integration/ab-test` into `main` (team agreement: branches keep diverging, re-merge at compatibility checkpoints).

## Still needed

- ⏳ **Neon `DATABASE_URL`** — then: `db:push`, seed, corpus import (Track A Gate 4), live route testing, persistence demo.
- Streaming memo endpoint (polish) · outbound-scan endpoint · see [[todo]].

Prev: [[2026-07-19-track-a-integration]]
