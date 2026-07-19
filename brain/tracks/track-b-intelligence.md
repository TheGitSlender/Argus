---
tags: [track-b]
owner: Lead + Claude
branch: merged to main
updated: 2026-07-19
---

# Track B — Intelligence

Status: 🟢 **Complete** — core engines + 8 hardening phases + 10 targeted fixes, all merged.

Deep dive: [[intelligence-layer]] · research: [[research/founder-predictors]] · tasks: [[todo]]

## What was delivered

| Component | Status |
|---|---|
| Founder Score engine (5 dims × 3 samples → bands) | ✅ |
| Visibility Index + capability−visibility gap | ✅ |
| Screen, 3-axis scoring, Validator, Playbook | ✅ |
| Delta updates + Adversarial pass + Memo generator | ✅ |
| Ambition & Drive read | ✅ |
| Pipeline orchestrator (DB-free) | ✅ |
| Persistence layer (`lib/persist.ts`) | ✅ |
| All 9 API routes | ✅ |
| Streaming memo (AI SDK `streamObject`) | ✅ |
| Outbound scan intake with entity resolution | ✅ |
| NL query → structured filter | ✅ |
| Interview-notes → Signal → delta loop | ✅ |

## Hardening (8 phases, all merged)

| Phase | What | Tests |
|---|---|---|
| 1 | Unit tests for band-math, visibility, coverage | 64 tests |
| 2 | Pipeline resilience — `Promise.allSettled`, graceful degradation | — |
| 3 | Prompt refinement — adversarial structuring, calibration anchors | — |
| 4 | Coverage formula — specificity, recency decay, minimum evidence floor | — |
| 5 | Delta update sophistication — `priorDeltaSummary` | — |
| 6 | Memo quality — adversarial failure graceful degradation | — |
| 7 | ScoreHistory enrichment — `medianIndex` | — |
| 8 | Full verification | 64 tests pass |

## 10 targeted fixes (all merged)

Null safety, per-opportunity queries, retry logic, truncation suffix, batched writes, doc sync — all verified with tsc, lint, 64 unit tests, `test:intel`, `test:pipeline`, and full build.

## npm scripts

```bash
npm run test:unit        # 64 unit tests (no DB, no LLM, $0)
npm run test:intel       # ~20 LLM calls, smoke test (~$0.10)
npm run test:pipeline    # ~28 LLM calls, full pipeline (~$0.10)
```

## Models

| Tier | Model | Used for |
|---|---|---|
| extract | gpt-4.1-nano | screen, extraction |
| score | gpt-4.1-mini | dimension sampling (temp 0.8), axes, validator, ambition, delta |
| heavy | gpt-4.1 | playbook, adversarial, memo |
