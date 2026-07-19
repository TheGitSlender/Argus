# Track A Status

## Current gate

- Gate: 5 — Handoff and freeze
- State: accepted; ready to commit
- Branch: `track-a-data`
- Git author: `Aress07 <taha.mahha21@gmail.com>`

## Ownership baseline

- All files inherited from `main` were created by `TheGitSlender` and are read-only.
- Aress07-owned files: `TRACK_A_PLAN.md`, `TRACK_A_STATUS.md`, and the Track A files added under `scripts/track-a/` by accepted/local gates.
- Preserved unrelated untracked paths: `.agents/`, `VC_BRAIN_HANDOFF.md`, `skills-lock.json`.

## Gate 0 checklist

- [x] Confirm Git identity.
- [x] Create and switch to `track-a-data`.
- [x] Confirm no tracked changes existed before work.
- [x] Persist Track A plan and status ledger.
- [x] Install exact dependencies with `npm ci` without tracked changes.
- [x] Create ignored `.env` from the existing example.
- [x] Configure dedicated local prototype database.
- [x] Apply existing Prisma schema to the test database.
- [x] Run existing baseline seed unchanged.
- [x] Verify baseline database counts and tracked-file cleanliness.
- [x] Present evidence and receive explicit Gate 0 acceptance.

## Decisions

- Primary data path: synthetic corpus, then Adaption.
- Live fetchers: deferred stretch; GitHub first if explicitly activated.
- Existing-file edits require explicit per-file approval.
- Work cannot advance to Gate 1 until Gate 0 is accepted.
- `TRACK_A_STATUS.md` is the live build ledger and must be updated whenever work advances or verification changes gate evidence.
- Runtime extraction uses Groq during development through `OPENAI_BASE_URL`; the later OpenAI switch changes environment configuration only.
- Upstream changes are merged from `origin/main` into `track-a-data` only; main is never changed or pushed by that operation.

## Gate 1 checklist

- [x] Add a Track A-local Zod corpus contract.
- [x] Add 36 explicitly synthetic founder profiles with the required archetype distribution.
- [x] Add exactly 10 synthetic deck signals with slide markers and reference claims.
- [x] Add corpus-level validation for IDs, ingestion keys, synthetic markers, archetypes, decks, and contradiction pairs.
- [x] Add tests for valid corpus and critical failure modes.
- [x] Run validator, tests, lint/type checks, and ownership audit.
- [x] Present evidence and receive explicit Gate 1 acceptance.

## Gate 2 checklist

- [x] Add a standalone importer without modifying package scripts or the inherited seed.
- [x] Support safe dry-run and explicit apply modes.
- [x] Import Founder, Company, Opportunity, OpportunityFounder, Identity, Signal, and Claim records only.
- [x] Reject identity and signal collisions instead of silently reassigning evidence.
- [x] Preserve append-only ScoreHistory and ReasoningLog tables.
- [x] Verify first-import counts and second-run zero-duplicate behavior.
- [x] Run tests, type checks, lint, and ownership audit.
- [x] Present evidence and receive explicit Gate 2 acceptance.

## Deferred Adaption checklist

- [ ] Configure `ADAPTION_API_KEY` in ignored `.env`.
- [ ] Run the five-row estimate-first spike and full deck batch after the remaining core Person A functionality is accepted.

## Gate 3 checklist

- [x] Add a deterministic entity-candidate contract and resolver.
- [x] Auto-link exact email or exact source/handle matches only.
- [x] Route name plus company/location matches to review without merging.
- [x] Reject conflicting exact identifiers and ambiguous homonyms.
- [x] Persist only identities attached to exact accepted matches.
- [x] Generate a review report for non-linked candidates.
- [x] Verify idempotent apply behavior and protected-table counts.
- [x] Run tests, type checks, lint, and ownership audit.
- [x] Present evidence and receive explicit Gate 3 acceptance.

## Gate 4 checklist

- [x] Add deterministic local PDF text extraction with slide markers and source hashing.
- [x] Add idempotent extracted-deck ingestion into `Signal` without changing inherited seed code.
- [x] Cover multi-page, empty-page, malformed, encrypted, and overwrite-safety behavior.
- [x] Add a default-dry-run runtime claim replay capped at three Signals.
- [x] Route every extraction call through `runLLM()` with the frozen extraction contract.
- [x] Skip Adaption-processed Signals and reject claims not grounded verbatim in source text.
- [x] Prevent duplicate Claims within model output and across reruns.
- [x] Verify one provider call is logged and an explicit replay uses the existing cache.
- [x] Run regressions, type checks, lint, database checks, and ownership audit.
- [x] Present evidence and receive authorization to finalize and push Gate 4.

## Blockers

- None for Gate 5.
- Adaption remains explicitly deferred by the user.

## Gate 5 checklist

- [x] Add a deterministic handoff verifier for hidden-gem, cold-start, contradiction, and persistent-identity cases.
- [x] Document corpus shape, importer order, entity thresholds, runtime extraction, commands, and current counts.
- [x] Record Adaption as deferred with zero spend and no fabricated evaluation result.
- [x] Document known gaps, ownership boundaries, and the exact clean-rebuild procedure.
- [x] Rebuild Track A in a separate clean local database without touching the working database.
- [x] Query and validate all four demonstration cases from that clean database.
- [x] Run all validators, tests, database checks, lint, type checks, and production build.
- [x] Present evidence and receive explicit Gate 5 acceptance before committing or pushing.

## Evidence log

- Preflight: branch was `main`, tracking `origin/main`, with no tracked modifications.
- Existing unrelated untracked paths were present and preserved.
- Git identity confirmed as `Aress07 <taha.mahha21@gmail.com>`.
- Created branch `track-a-data`.
- First `npm ci` attempt failed because Windows locked a partial native dependency install.
- Moved the failed generated directory to `C:\Users\taham\AppData\Local\Temp\Argus-node_modules-failed-20260719-001` for recovery.
- Clean `npm ci` retry succeeded: 445 packages installed and Prisma Client 6.19.3 generated.
- npm reported two moderate vulnerabilities and a Prisma 7 configuration deprecation; no automatic fixes were run because dependency files are teammate-owned.
- Verified `.env` and `node_modules` are ignored, Next's bundled docs exist, Prisma Client exists, and no inherited tracked file changed.
- Credential presence check: `DATABASE_URL`, `OPENAI_API_KEY`, `GITHUB_TOKEN`, and `ADAPTION_API_KEY` are all currently unset.
- Started named local Prisma Postgres/PGlite instance `argus-track-a` in detached mode; no PostgreSQL or Docker installation is required.
- Configured the ignored `.env` to use the local TCP PostgreSQL URL.
- Local verification exposed Prisma 6 prepared-statement reuse through the single-connection PGlite proxy; configured `connection_limit=1&pgbouncer=true` in the ignored local URL and kept database checks serial.
- Applied the inherited Prisma schema successfully and generated Prisma Client 6.19.3.
- Ran the inherited seed unchanged: 4 founders, 1 thesis, 5 signals, 6 claims, 1 ScoreHistory row, and 0 ReasoningLog rows.
- Confirmed local instance `argus-track-a` is running and no inherited tracked file changed.
- User accepted Gate 0.
- Gate 0 committed as `27317ea` by `Aress07` with no co-author metadata.
- Gate 1 corpus validates: 36 profiles, 10 decks, 40 signals, 54 reference claims, and 4 two-sided contradiction cases.
- Archetype distribution validates: 8 hidden gems, 6 hype, 6 cold-start, 4 contradiction, 6 research, and 6 balanced profiles.
- Gate 1 tests: 5 passed, 0 failed, covering canonical validity, Track B score rejection, duplicate ingestion keys, incomplete contradictions, and missing deck slide markers.
- ESLint and `tsc --noEmit` pass for the new Track A implementation.
- An unrelated `.gitignore` change adding `.obsidian` appeared during Gate 1 and is preserved unstaged; inherited Markdown files have no content diff despite Windows line-ending status noise.
- User accepted Gate 1.
- Gate 1 committed as `100cb28` by `Aress07` with no co-author metadata.
- User deferred all Adaption work until the remaining core Person A functionality is complete.
- Gate 2 dry-run planned exactly 36 founders, 36 companies, 36 opportunities, 36 founder links, 30 identities, 40 signals, and 54 claims.
- The initial interactive-transaction import stopped local PGlite after 19 profiles; protected tables were unchanged and the idempotent importer correctly recognized the partial state.
- Replaced the unsupported long interactive transaction with serial collision-checked operations and resumed safely.
- Final idempotence run created zero rows and reused every expected corpus record.
- Database totals now include baseline plus corpus: 40 founders, 38 companies, 38 opportunities, 38 founder links, 31 identities, 45 signals, and 60 claims.
- Verified hidden-gem, cold-start, and contradiction evidence chains through Founder → Opportunity/Identity → Signal → Claim.
- `ScoreHistory` remains 1 and `ReasoningLog` remains 0.
- Gate 1 + Gate 2 tests: 10 passed, 0 failed; ESLint and `tsc --noEmit` pass.
- User accepted Gate 2.
- Gate 2 committed as `dc5db83` by `Aress07` with no co-author metadata.
- Gate 3 dry-run resolved 6 candidates as 2 exact links, 1 review, 2 unresolved, and 1 conflict.
- First apply created exactly 1 new BLOG identity and reused 1 existing Product Hunt identity; review/unresolved/conflict cases produced no writes.
- Second apply created zero identities and reused both exact matches.
- Review report written outside the repository at `C:\Users\taham\AppData\Local\Temp\argus-track-a-entity-resolution-report.json`.
- Identity total is 32; Amina's exact-email BLOG identity is persisted at confidence 1.0.
- `ScoreHistory` remains 1 and `ReasoningLog` remains 0.
- Gate 1–3 regression suite: 17 passed, 0 failed; ESLint and `tsc --noEmit` pass.
- User accepted Gate 3.
- Gate 4 local PDF extraction uses pinned `pypdf==6.14.2` from a temporary virtual environment; no inherited dependency files changed.
- PDF tests cover deterministic two-page extraction, slide markers, source hashing, empty slides, malformed files, password-protected files, and overwrite protection.
- Extracted deck JSON validates before a default-dry-run, idempotent `Signal` ingestion step; canonical source URL collisions are rejected.
- Runtime claim extraction calls only the inherited `runLLM()` wrapper with `MODELS.extract`, `extractionOutputSchema`, `extract_claims`, and `inputRefs.signalId`; caching remains enabled.
- A deterministic grounding boundary rejects any claim that is not a source substring and rejects incorrect slide locations before database insertion.
- Gate 1–4 TypeScript regression suite: 27 passed, 0 failed; ESLint and `tsc --noEmit` pass.
- Gate 4 Python suite: 4 passed, 0 failed.
- End-to-end no-write smoke test passed: temporary PDF → extraction JSON → deck ingestion plan → claim replay selection.
- Replay dry-run selected one eligible unclaimed Product Hunt Signal and made no LLM call.
- Missing-key apply check stopped before a provider call or write; database remains at 45 Signals, 60 Claims, 0 ReasoningLogs, and 1 ScoreHistory row.
- Development runtime is configured for Groq's OpenAI-compatible endpoint with `openai/gpt-oss-20b`; no inherited LLM code changed.
- First live extraction processed one eligible Product Hunt Signal, created 2 verbatim-grounded Claims, and appended exactly 1 `extract_claims` ReasoningLog.
- The logged call used 380 input tokens and 569 output tokens.
- Explicit replay of the same Signal returned `cached: true`, made no new provider call, and created 0 duplicate Claims.
- Database totals after live verification: 45 Signals, 62 Claims, 1 ReasoningLog, and 1 ScoreHistory row.
- Fetched `origin/main` at `0e0b2c8` and merged it into `track-a-data` as `5649581`; `origin/main` remained unchanged and nothing was pushed.
- Restored all isolated Gate 4/ledger work after the merge; the pre-existing `.gitignore` change auto-merged without conflict, and unrelated local paths remained untouched.
- Reviewed main's updated frozen interfaces read-only: claim extraction contracts and the `runLLM()` call shape remain compatible with Gate 4.
- Applied main's additive nullable `FounderScore.ambitionRead` field to local PGlite with `prisma db push`; Prisma Client 6.19.3 regenerated successfully.
- Post-merge checks pass: 27 Track A TypeScript tests, 4 PDF tests, and `tsc --noEmit`; project ESLint reports 0 errors and 1 inherited warning in `lib/intel/prompts.ts`.
- Post-merge claim replay dry-run selected 0 Signals and made no provider call because all current Signals now have Claims.
- Final Gate 4 verification passed: 4 Python tests, 27 TypeScript tests, `tsc --noEmit`, and the Next.js 16 production build.
- Project ESLint completed with zero errors and one inherited warning in `lib/intel/prompts.ts`; no inherited file was edited to suppress it.
- Corpus validator returned 36 profiles, 10 decks, 40 Signals, 54 reference Claims, and 4 contradiction cases.
- Importer dry-run created zero rows and reused the complete corpus; protected counts remained 1 ScoreHistory and 1 ReasoningLog.
- Entity-resolution dry-run remained 2 linked, 1 review, 2 unresolved, and 1 conflict with zero writes.
- Explicit runtime replay remained a cache hit and created zero Claims, confirming no additional provider call or duplicate insertion.
- Production HTTP smoke test passed: homepage 200, 38 opportunities returned, active thesis `Maschmeyer AI Seed Thesis`, and no server errors.
- Added `TRACK_A_TESTING.md` with reproducible environment, database, regression, PDF, ingestion, cache, application, and safety checks.
- User authorized final verification, documentation, commit, and push to `track-a-data`; Gate 5 remains unstarted.
- Gate 4 committed as `ed745e0` by `Aress07 <taha.mahha21@gmail.com>` with no co-author or assistant contributor metadata.
- Pushed merged main history plus accepted Gates 2–4 to `origin/track-a-data`; `origin/main` was not changed.
- User authorized starting Gate 5; no stretch fetcher or Adaption work has started.
- Added a stable Gate 5 verifier for `syn-003` hidden gem, `syn-015` cold start, `syn-021` contradiction, and `syn-001` persistent identity.
- Current-database handoff verification passed with 40 founders, 38 companies/opportunities, 32 identities, 45 Signals, 62 Claims, 1 ScoreHistory, and 1 ReasoningLog.
- Created separate named local PGlite instance `argus-track-a-gate5`; the primary `argus-track-a` database was not modified by the rebuild.
- Clean schema push and unchanged baseline seed succeeded.
- Clean first corpus import created the complete corpus; second import created zero rows and reused every corpus row.
- Clean first entity apply created 1 and reused 1 exact identity; second created 0 and reused 2 while review/unresolved/conflict cases remained unwritten.
- Clean runtime extraction created 2 grounded Claims and 1 ReasoningLog; explicit replay returned `cached: true` and created 0 Claims.
- All four demonstration cases passed against the clean database with final totals matching the working database.
- Added `TRACK_A_HANDOFF.md` and updated `TRACK_A_TESTING.md`; Adaption is recorded honestly as 0 calls, 0 estimated/spent credits, and no evaluation.
- Final freeze checks passed: 29 TypeScript tests, 4 PDF tests, corpus validator, importer dry-run, entity dry-run, four-case verifier, `tsc --noEmit`, and Next.js production build.
- ESLint completed with 0 errors and the single documented inherited `_extra` warning in `lib/intel/prompts.ts`.
- Stopped only `argus-track-a-gate5` after verification; its named rebuild data remains available while primary `argus-track-a` remains running.
- Clean-rebuild Groq usage was exactly 1 logged call with 380 input tokens, 574 output tokens, and 1,084 ms latency; replay added no call. Exact monetary charge was not exposed and is not fabricated.
- User explicitly accepted Gate 5.
