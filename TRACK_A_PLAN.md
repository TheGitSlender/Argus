# Track A — Data & Memory Execution Plan

## Working contract

- Work only on `track-a-data`.
- Read this file and `TRACK_A_STATUS.md` before each work session.
- Implement exactly one gate at a time. Do not start the next gate until the current gate's checks pass and the user accepts it.
- Before editing a tracked file, use Git history to identify its creator. Edit only files created by `Aress07`; request explicit permission for every exception.
- Preserve unrelated changes and untracked files.
- Do not modify `lib/contracts.ts`, `prisma/schema.prisma`, `lib/llm.ts`, `prisma/seed.ts`, or `package.json` without explicit per-file permission.
- Never update or delete `ScoreHistory` or `ReasoningLog`. Every runtime LLM call must use `runLLM()`.
- Commit accepted gates separately as `Aress07`; never push or merge without permission.

## Gates

### Gate 0 — Reproducible foundation

- Install exact locked dependencies with `npm ci`.
- Run a named local Prisma Postgres/PGlite instance for prototyping and configure its URL in ignored `.env`; external-service keys may be added only before their gates.
- Apply the existing schema and run the existing seed unchanged.
- Verify Prisma connectivity, baseline counts, Git identity, branch, and tracked-file cleanliness.

Acceptance: dependency installation leaves tracked files unchanged, the test database connects, the baseline seed succeeds, and no non-Aress07 file is modified.

### Gate 1 — Synthetic corpus contract and validator

- Add a Track A-local Zod contract under `scripts/track-a/`.
- Build 36 explicitly fictional profiles: 8 hidden gems, 6 hype cases, 6 cold-start founders, 4 contradiction cases, 6 research founders, and 6 balanced controls.
- Include 10 synthetic deck texts with slide markers and reference claims.
- Label every record synthetic and give it stable IDs and deterministic ingestion keys.
- Do not provide Founder Scores or investment decisions; Track B owns those outputs.

Acceptance: 100% schema-valid JSONL, unique stable IDs, all archetypes present, and every deliberate contradiction has both source sides.

### Gate 2 — Adaption five-row spike

- Add an isolated Python workflow under `scripts/adaption/`.
- Upload five JSONL rows, estimate first, and stop if the estimate exceeds 50 credits.
- Run upload, adaptation, wait, download, and evaluation.
- Preserve a secret-free run manifest with IDs, prompt version, input hash, credits, timestamps, evaluation, and output location.

Acceptance: all five rows return, validate, remain attributable to inputs, and have recorded evaluation and credit usage.

### Gate 3 — Full deck and claim batch

- Process 10 synthetic decks per document with a versioned universal extraction prompt.
- Require claim text, category, source location, and specificity.
- Estimate first and reserve at least 600 of 2,000 credits; reduce scope if the estimate exceeds 1,400.
- Preserve raw inputs, raw output, normalized output, prompt version, and evaluation report.

Acceptance: 100% schema validity, zero invented numerical claims, at least 85% category agreement, at least 95% source-location retention, and full claim-to-deck traceability.

### Gate 4 — Idempotent Postgres importer

- Add a standalone importer invoked with `npx tsx`; do not edit existing package scripts or seed files.
- Import Founder, Company, Opportunity, Identity, Signal, and Claim through the existing schema.
- Use stable synthetic identifiers, canonical `synthetic://` URLs, and ingestion keys in `Signal.meta`.
- Never delete data or write score/history/reasoning records.

Acceptance: dry-run counts are correct, first import creates the intended corpus, second import creates zero duplicates, and sampled evidence chains are valid.

### Gate 5 — Entity resolution

- Auto-link exact email or exact source/handle matches at confidence >= 0.95.
- Send normalized name plus company/location matches to review at confidence 0.80–0.94.
- Never merge ambiguous matches below 0.80.
- Test repeated identities, homonyms, and ambiguous inputs.

Acceptance: repeats resolve to one Founder, homonyms stay separate, ambiguous cases remain unresolved, and reruns are idempotent.

### Gate 6 — Runtime claim-extraction fallback

- Add a replay script for Signals not handled by Adaption.
- Call existing `runLLM()` with `MODELS.extract`, `extractionOutputSchema`, step `extract_claims`, and `inputRefs.signalId`.
- Keep caching enabled and begin with three Signals.
- Skip Adaption-processed Signals and prevent duplicate Claims.

Acceptance: valid Claims are created, paid calls are logged once, repeated runs hit cache, and unsupported facts are not invented.

### Gate 7 — Handoff and freeze

- Document corpus shape, commands, counts, Adaption spend/evaluation, importer order, entity thresholds, and known gaps.
- Demonstrate hidden-gem, cold-start, contradiction, and persistent-identity cases.
- Run all validators, fixture tests, database integration tests, and non-rewriting lint/type checks.

Acceptance: another teammate can rebuild Track A from a clean test database and query all four demonstration cases.

### Stretch gate — One live fetcher

- Begin only after Gates 0–7 are accepted and only with explicit activation.
- Implement GitHub first with fixtures and one optional live smoke test.
- Store popularity metrics as visibility metadata only; never use them as capability evidence.
- Keep HN, Devpost, arXiv, and Product Hunt deferred.

## Per-gate verification protocol

1. Read `TRACK_A_STATUS.md` and inspect Git status.
2. Verify ownership of every intended edit.
3. Run fixture/unit checks before live checks.
4. Run the smallest possible live sample.
5. Exercise invalid input, missing fields, duplicates, provider failure, and partial output.
6. Report commands, relevant output, changed files, cost, and remaining risks.
7. Update `TRACK_A_STATUS.md` and wait for explicit gate acceptance.

## Fixed assumptions

- The primary path is synthetic data followed by Adaption; public-source fetchers are deferred.
- Gate 0 uses named local Prisma Postgres/PGlite; Adaption and OpenAI credentials are required only before their first live gates.
- The challenge PDF is currently absent. If supplied, reconcile it before continuing because the handoff names it as source of truth.
- Existing tracked files remain immutable unless the user authorizes a named exception.
