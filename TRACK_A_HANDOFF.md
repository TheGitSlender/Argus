# Track A — Data & Memory Handoff

## Freeze status

Track A core Gates 0–4 are accepted. Gate 5 verifies that another teammate can rebuild and inspect the ingestion path without relying on the original working database. This document freezes the current operating contract; live fetchers and Adaption remain outside the accepted core.

Branch: `track-a-data`

Primary runtime database: named local Prisma Postgres/PGlite instance `argus-track-a`.

Clean-rebuild proof database: separate named local instance `argus-track-a-gate5`. It was created only for Gate 5 and did not modify the primary database.

## Ownership and immutable boundaries

- Track A implementation and documentation added by Aress07 live under `data/track-a/`, `scripts/track-a/`, and the root `TRACK_A_*.md` files.
- Inherited files remain teammate-owned and read-only unless the user grants a named exception.
- `lib/contracts.ts`, `lib/llm.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, and `package.json` are consumed as shared interfaces; Track A did not edit them.
- `ScoreHistory` and `ReasoningLog` are append-only. Track A import, entity-resolution, and verification scripts never update or delete either table.
- Every runtime model call goes through the inherited `runLLM()` wrapper.

## Corpus shape

The versioned JSONL corpus contains 36 explicitly fictional profiles:

| Archetype | Profiles |
|---|---:|
| Hidden gem | 8 |
| Hype | 6 |
| Cold start | 6 |
| Contradiction | 4 |
| Research | 6 |
| Balanced | 6 |

Corpus evidence totals:

- 10 deck Signals with slide markers
- 40 total Signals
- 54 curated reference Claims
- 4 contradiction cases with both assertion and counter-evidence sides
- No Founder Scores or investment decisions supplied by Track A
- All identities, URLs, emails, and profile metadata explicitly marked synthetic

## Database shape after a complete rebuild

The unchanged inherited baseline seed plus Track A produces:

| Model | Rows |
|---|---:|
| Founder | 40 |
| Company | 38 |
| Opportunity | 38 |
| OpportunityFounder | 38 |
| Identity | 32 |
| Signal | 45 |
| Claim | 62 |
| ScoreHistory | 1 |
| ReasoningLog | 1 |

The final two Claims and the ReasoningLog come from one grounded runtime extraction over the baseline Product Hunt Signal. Its replay uses the ReasoningLog cache and creates zero duplicates.

Gate 5 clean-rebuild provider usage was one `openai/gpt-oss-20b` call: 380 input tokens, 574 output tokens, and 1,084 ms logged latency. The API did not expose a monetary charge; no exact currency amount is claimed.

## Rebuild order

Use a clean database URL; never point this procedure at production.

1. Install exact Node dependencies with `npm ci`.
2. Start or provision an empty Postgres-compatible database.
3. Set `DATABASE_URL` for that database.
4. Run `npx prisma db push`.
5. Run the inherited baseline with `npm run db:seed`.
6. Validate the corpus with `npx tsx scripts/track-a/validate-corpus.ts`.
7. Run `npx tsx scripts/track-a/import-corpus.ts --apply` twice.
8. Run `npx tsx scripts/track-a/entity-resolution.ts --apply` twice.
9. Run `npx tsx scripts/track-a/claim-extraction.ts --apply --limit 1` once.
10. Replay the emitted Signal ID with `--signal-id`; require `cached: true` and `created: 0`.
11. Run `npx tsx scripts/track-a/verify-handoff.ts`.
12. Run all checks from `TRACK_A_TESTING.md`.

The first corpus import creates 36 founders, 36 companies, 36 opportunities, 36 founder links, 30 identities, 40 Signals, and 54 Claims. The second creates zero rows and reuses all of them.

The first entity-resolution apply creates one new exact BLOG identity and reuses one exact Product Hunt identity. The second creates zero identities and reuses both exact matches.

## Ingestion and extraction interfaces

### Corpus importer

- Default mode is dry-run; writes require `--apply`.
- Stable founder emails, company/opportunity keys, identity source/handle pairs, canonical source URLs, and `Signal.meta.ingestionKey` provide idempotence.
- Existing rows are collision-checked before reuse.
- Import order is Founder → Company → Opportunity → OpportunityFounder → Identity → Signal → Claim.
- Local PGlite operations remain serial because it reliably supports one active connection.

### Entity resolution

| Evidence | Result | Confidence |
|---|---|---:|
| Exact normalized email | Auto-link | 1.00 |
| Exact source + handle | Auto-link | 0.98 |
| Normalized name + company/location | Human review only | 0.80–0.94 |
| Name-only or ambiguous evidence | Unresolved | Below 0.80 |
| Exact identifiers disagree | Conflict; no write | 0 |

The resolver never creates a Founder and persists identities only for exact accepted matches.

### Local deck extraction

- `deck_extract.py` uses pinned `pypdf==6.14.2`.
- Output includes the source SHA-256, page count, empty-slide list, per-page text, and deterministic `Slide N:` blocks.
- Malformed, password-protected, empty-page, and output-overwrite behavior is tested.
- `ingest-deck.ts` validates the extraction JSON and plans by default; `--apply` creates a `DECK` Signal.
- Existing canonical source URLs must match founder/opportunity, text, source hash, and source type or ingestion fails.

### Runtime claim extraction

- Development provider: Groq through `OPENAI_BASE_URL=https://api.groq.com/openai/v1`.
- Development extraction model: `openai/gpt-oss-20b`.
- Later OpenAI migration is environment-only; do not fork or bypass `runLLM()`.
- Calls use step `extract_claims`, `MODELS.extract`, `extractionOutputSchema`, and `inputRefs.signalId`.
- Default selection is a dry-run capped at three unclaimed, non-Adaption Signals.
- Accepted claim text must be grounded as a source substring; incorrect slide locations and unsupported claims are rejected before insertion.
- Existing and within-response duplicates are rejected.

## Four demonstration cases

Run:

```powershell
npx tsx .\scripts\track-a\verify-handoff.ts
```

The verifier uses stable corpus IDs rather than database-generated CUIDs:

| Case | Profile | Proof |
|---|---|---|
| Hidden gem | `syn-003` — Neha Kulkarni / ClinicPatch | Unfunded student, non-visibility build evidence, 1 Signal and 2 Claims |
| Cold start | `syn-015` — Marta Silva / QuietCare | Exactly one deck Signal with slide markers and 2 Claims |
| Contradiction | `syn-021` — Nadia Voss / FreightBloom | Shared `contradiction-01` with assertion and counter-evidence Signals |
| Persistent identity | `syn-001` — Amina Kader / DockLens | One Founder/opportunity reused across GITHUB and exact-email BLOG identities |

The verifier is read-only and asserts that `ScoreHistory` and `ReasoningLog` counts do not change.

## Adaption status and spend

- Status: explicitly deferred by the user until after core Person A work.
- API calls made: 0
- Credits estimated: 0
- Credits spent: 0
- Evaluation run: not run
- Evaluation result: none; no quality metric is claimed or fabricated

If activated later, Adaption must remain an estimate-first offline batch stage. It is not a runtime application database or request-path dependency.

## Known gaps and deferred work

- Adaption spike and full deck batch are deferred.
- GitHub, Hacker News, Devpost, arXiv, and Product Hunt live fetchers are deferred stretch work; current live-looking evidence is synthetic or inherited baseline data.
- PDF extraction does not perform OCR; scanned/image-only pages are reported as empty and need a future OCR stage.
- The original challenge PDF is absent, so no reconciliation against it has been performed.
- The root page remains the inherited starter UI; Track A exposes data and scripts rather than editing Track C screens.
- Local PGlite is intended for prototyping and serial checks, not concurrent production traffic.
- Groq is the temporary development provider. Production model/provider choice remains an environment and billing decision.
- No Adaption quality score should be shown until a real evaluated run exists.

## Final verification commands

See `TRACK_A_TESTING.md` for complete manual instructions. The minimum freeze check is:

```powershell
npx tsx .\scripts\track-a\validate-corpus.ts
npx tsx --test scripts/track-a/*.test.ts
npx tsx .\scripts\track-a\import-corpus.ts --dry-run
npx tsx .\scripts\track-a\entity-resolution.ts --dry-run
npx tsx .\scripts\track-a\verify-handoff.ts
npx tsc --noEmit
npm run lint
npm run build
```

Expected known lint state: zero errors and one inherited `_extra` warning in `lib/intel/prompts.ts`.
