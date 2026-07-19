# Track A Manual Testing

Run these commands from the repository root on branch `track-a-data`. Stop at the first unexpected result.

## 1. Confirm branch and environment

```powershell
git branch --show-current
git status --short
```

Expected branch: `track-a-data`. Do not test from `main`.

The ignored `.env` must contain non-empty values for:

```text
DATABASE_URL
OPENAI_API_KEY
OPENAI_BASE_URL=https://api.groq.com/openai/v1
MODEL_EXTRACT=openai/gpt-oss-20b
```

`OPENAI_API_KEY` contains the Groq key during development. Never commit or paste `.env` into logs or chat.

## 2. Start and inspect the local database

```powershell
npx prisma dev start argus-track-a
npx prisma db push
```

To inspect rows manually:

```powershell
npx prisma studio --port 5555
```

Open `http://localhost:5555`, inspect `Signal`, `Claim`, `Identity`, and `ReasoningLog`, then stop Studio before running pipeline scripts because local PGlite supports one active connection reliably.

Expected current totals after Gates 0–4:

- 45 Signals
- 62 Claims
- 32 Identities
- 1 ReasoningLog
- 1 ScoreHistory row

## 3. Run deterministic regression checks

```powershell
$trackAVenv = Join-Path $env:TEMP "argus-track-a-venv"
if (-not (Test-Path (Join-Path $trackAVenv "Scripts\python.exe"))) {
  python -m venv $trackAVenv
}
& (Join-Path $trackAVenv "Scripts\python.exe") -m pip install -r .\scripts\track-a\requirements-deck.txt
$env:PYTHONDONTWRITEBYTECODE = "1"
& (Join-Path $trackAVenv "Scripts\python.exe") -m unittest discover -s .\scripts\track-a -p "deck_extract_test.py" -v
npx tsx --test scripts/track-a/*.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

Expected:

- 4 Python tests pass.
- 27 TypeScript tests pass.
- TypeScript and production build pass.
- ESLint has zero errors. Main currently has one inherited `_extra` warning in `lib/intel/prompts.ts`.

## 4. Verify corpus and importer idempotence

```powershell
npx tsx .\scripts\track-a\validate-corpus.ts
npx tsx .\scripts\track-a\import-corpus.ts --dry-run
```

Expected corpus: 36 profiles, 10 decks, 40 Signals, 54 reference Claims, and 4 contradiction cases. The importer must report zero created rows and reuse all 36 founders, 40 Signals, and 54 Claims.

## 5. Verify entity resolution without writes

```powershell
npx tsx .\scripts\track-a\entity-resolution.ts --dry-run
```

Expected: 2 linked, 1 review, 2 unresolved, 1 conflict, and zero created identities. `ScoreHistory` and `ReasoningLog` counts must not change.

## 6. Test local PDF extraction

Choose a local PDF and an output path that does not exist:

```powershell
$pdfPath = "C:\path\to\deck.pdf"
$deckJson = Join-Path $env:TEMP "argus-manual-deck.json"
& (Join-Path $trackAVenv "Scripts\python.exe") .\scripts\track-a\deck_extract.py $pdfPath --output $deckJson
Get-Content $deckJson -Raw
```

Expected JSON includes `sourceSha256`, `pageCount`, `emptySlides`, and text blocks beginning with `Slide 1:`. Reusing the same output path must fail unless `--force` is supplied.

Plan Signal ingestion without writing:

```powershell
npx tsx .\scripts\track-a\ingest-deck.ts --dry-run --extraction $deckJson --source-url "synthetic://manual/deck-v1"
```

Expected action: `create`. Use `--apply` only for a real deck you intend to preserve; Signals are evidence and are not deleted by Track A scripts.

## 7. Verify claim cache and deduplication

The current local verification Signal is `cmrr21tk9000tc31wqa70cawz`:

```powershell
npx tsx .\scripts\track-a\claim-extraction.ts --apply --signal-id cmrr21tk9000tc31wqa70cawz
```

Expected: `cached: true`, `created: 0`, and both returned claims rejected as duplicates. This command must not add a second `ReasoningLog`.

For a newly ingested real deck, first run claim extraction without `--apply`, then apply only to its exact Signal ID. The default limit is three Signals.

## 8. Smoke-test the merged application

```powershell
npm run dev
```

Open these URLs:

- `http://localhost:3000/` — should render without a server error.
- `http://localhost:3000/api/opportunities` — should return JSON; current local database has 38 opportunities.
- `http://localhost:3000/api/thesis` — should return the active `Maschmeyer AI Seed Thesis`.

Stop the server with `Ctrl+C` after testing.

## 9. Final safety check

```powershell
git diff --check
git status --short --branch
```

Track A commands must never update or delete `ScoreHistory` or `ReasoningLog`. The only expected ReasoningLog change is an append from a genuinely uncached `runLLM()` call.
