---
tags: [changelog, track-b, track-a, integration]
commit: integration/ab-test + visibility parser on track-b-intel
branch: integration/ab-test
date: 2026-07-19
---

# Track A Corpus Integration Test

> [!info] Commits
> `feat: parse visibility counts from signal prose` (track-b-intel) · `test: Track A corpus -> Track B intelligence integration` (branch `integration/ab-test` = track-b-intel + track-a-data merged locally). Track A's own commits: `27317ea` (workflow), `100cb28` (synthetic corpus) by Aress07.

## What Track A shipped

- Gate-based execution plan (`TRACK_A_PLAN.md`) + status ledger — disciplined, guards our frozen files, respects append-only rules.
- **36 synthetic profiles** (`data/track-a/profiles.jsonl`): 8 hidden gems, 6 hype, 6 cold-start, 4 two-sided contradiction cases, 6 research, 6 balanced. 40 signals, 10 decks with slide markers, 54 reference claims.
- Strict zod corpus contract + validator + 5 passing tests. Correctly refuses Founder Scores (Track B territory).

## Integration results

| Check | Result |
|---|---|
| Their validator + tests on our toolchain | ✅ all pass |
| Enum/shape compatibility (source, category, context, identity) | ✅ exact match with `lib/contracts.ts` |
| 36 profiles → `EvidenceBundle` conversion | ✅ clean (`scripts/integration/corpus-bundle.ts`) |
| Visibility separation | ✅ after fix: hype avg 25.6 vs hidden-gem 1.3 |
| Live spot check (screen + ambition) | ✅ gem → `back_the_person`/low hype; hype → `unclear`/medium |

## Gap found & fixed on our side

Corpus carries visibility counts as **prose** ("62,000 followers") — their strict meta schema has no numeric fields — so the deterministic Visibility Index read 0 for everyone. Added `parseVisibilityFromText` (regex + word-numbers) to `lib/intel/visibility.ts`; structured meta still wins when present.

## Feedback for Track A (relay via lead)

See [[tracks/track-a-data]] — evidence density on hidden gems + optional structured visibility meta.

Prev: [[2026-07-19-ambition-and-pipeline]]
