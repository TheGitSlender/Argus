---
tags: [changelog, track-b, integration, milestone]
commit: pending
branch: track-b-intel -> main
date: 2026-07-19
---

# Team Merge Review — All Tracks Verified + Corpus to Prod

> [!info] What happened
> While the lead was away, teammates pushed 28 commits to `main`: Track A Gates 2-5 (deck extraction, importer, entity resolution, handoff freeze), a `track-b-intel-hardening` branch (10 fixes + 64 unit tests), Track C's complete UI (6 pages, design system), and a **Track D plan** (outbound sourcing & activation, owner malakmekyassi — [[tracks/track-d-sourcing]]). This session: reviewed everything, merged `main` into `track-b-intel`, fixed one bug, imported the corpus into the prod DB, merged back.

## Review verdict on the hardening (our files, changed by teammate)

| Change | Verdict |
|---|---|
| `llm.ts` transport retry (backoff on 429/5xx) | ✅ good, invariants intact |
| Coverage formula v2 (specificity + 90-day recency decay + <2-signal floor of 0.15) | ✅ better than v1 |
| Pipeline `Promise.allSettled` graceful degradation + error collection | ✅ good |
| ScoreHistory band-position annotations, batched claim writes | ✅ fine |
| **Screen-stage failure → fabricated `reject` verdict** | ❌ **FIXED**: an OpenAI outage would have auto-PASSed a founder (route persists PASS on reject). Now throws → route 500s → retryable. Reject stays reserved for spam/incoherence. |

## Also this session

- 93 tests pass post-merge (64 intel + 29 track-a); tsc + `next build` clean (9 routes + 6 pages).
- **Imported the 36-profile corpus into the shared Neon DB** (prod!): 41 founders / 41 opportunities / 94 claims. Track A's importer proved append-only tables untouched. Discovery: the corpus had only been imported into Track A's local PGlite — Vercel prod reads Neon and would have shown 5 founders.
- Entity resolution ran against Neon (their reviewed-workflow guard correctly declined auto-creating founders).
- Seed script now refuses to wipe Neon without `FORCE_SEED=1`.

## Open questions for the team

1. **Which DB is canonical?** Brain said "local Postgres + Neon backup" — but Vercel prod reads Neon. Proposal: **Neon is canonical** for demo/prod; local instances are per-dev scratch.
2. Batch-scoring all 36 corpus profiles through the pipeline (~1,000 LLM calls, est. $5-15) — needed for the Hidden Gems scatter to be populated in prod. Awaiting lead's go.
3. Track D schema additions (Outreach model) — additive, looks sound, needs the frozen-interface announcement before `db push`.

Prev: [[2026-07-19-streaming-memo-and-scan]]
