---
tags: [track-a]
owner: Teammate 1 (Aress07)
updated: 2026-07-19
---

# Track A — Data & Memory

Status: 🟢 **Complete** — Gates 0-5 accepted, integration-verified against local Postgres.

## What was delivered

- **36-profile synthetic corpus** (`data/track-a/profiles.jsonl`): 8 hidden gems, 6 hype, 6 cold-start, 4 contradiction cases, 6 research, 6 balanced. 40 signals, 10 decks with slide markers, 54 reference claims.
- **Entity resolution** (`scripts/track-a/entity-resolution.ts`): email auto-link (confidence 1.0), handle auto-link (0.98), name+company review routing (0.94), ambiguity detection, conflict rejection.
- **Claim extraction** (`scripts/track-a/claim-extraction.ts`): grounded extraction with verbatim source validation, slide-location checks, dedup, Adaption metadata detection.
- **Corpus importer** (`scripts/track-a/import-corpus.ts`): idempotent import with collision checks, append-only protection for ScoreHistory/ReasoningLog.
- **Deck ingestion** (`scripts/track-a/ingest-deck.ts` + Python `deck_extract.py`): PDF → JSON extraction, schema validation, idempotent signal reuse.
- **Handoff verification** (`scripts/track-a/verify-handoff.ts`): 4 demo profiles verified (hidden gem, cold start, contradiction, persistent identity).

## Integration results (against local Postgres)

| Step | Result |
|---|---|
| `import-corpus --apply` | 36 founders, 36 companies, 36 opportunities, 30 identities, 40 signals, 54 claims |
| Re-run (idempotency) | 0 created, 232 reused |
| `entity-resolution --apply` | 2 linked, 1 review, 2 unresolved, 1 conflict |
| `claim-extraction --apply --limit 1` | 1 claim created (Product Hunt signal) |
| `verify-handoff` | All 4 demo profiles verified, DB counts match expected |
| Database counts | 40 founders, 38 companies, 38 opportunities, 32 identities, 45 signals, 61 claims |

## npm scripts

```bash
npm run test:track-a              # 29 unit tests (no DB, $0)
npm run test:track-a:import       # import corpus (--apply)
npm run test:track-a:resolve      # entity resolution (--apply)
npm run test:track-a:extract      # claim extraction (--apply --limit 1)
npm run test:track-a:verify       # verify handoff
```

## Feedback from Track B (addressed)

1. Evidence density on hidden gems — addressed via additional signals in corpus.
2. Structured visibility meta — `parseVisibilityFromText` added to `lib/intel/visibility.ts`.
3. Hype-case visibility contrast — verified: hype avg 25.6 vs hidden-gem 1.3.

## Files

```
data/track-a/profiles.jsonl              # 36 synthetic profiles
data/track-a/entity-candidates.jsonl     # 6 resolution candidates
scripts/track-a/corpus-schema.ts         # Zod contract + loader
scripts/track-a/import-corpus.ts         # Idempotent DB importer
scripts/track-a/entity-resolution.ts     # Identity resolution engine
scripts/track-a/claim-extraction.ts      # Grounded extraction
scripts/track-a/ingest-deck.ts           # Deck ingestion
scripts/track-a/deck_extract.py          # PDF → JSON extraction
scripts/track-a/verify-handoff.ts        # Gate 5 verification
TRACK_A_HANDOFF.md                       # Frozen handoff document
TRACK_A_PLAN.md                          # Gate plan (renumbered)
TRACK_A_STATUS.md                        # Evidence log
TRACK_A_TESTING.md                       # Test procedures
```
