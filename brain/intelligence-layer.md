---
tags: [track-b, intelligence]
updated: 2026-07-19
---

# Intelligence Layer (Track B)

Owner: Lead + Claude · branch merged to `main` · status in [[tracks/track-b-intelligence]] · fits into [[architecture]].

## File map

| File | Contains |
|---|---|
| `lib/llm.ts` | THE wrapper: cache → call → zod-validate (1 retry) → ReasoningLog. Fail-soft when DB absent |
| `lib/contracts.ts` | ALL zod schemas: ScoreBand, DimensionKey, ExtractedClaim, ScreenResult, AxisScoreOutput, AdversarialOutput, MemoDocument, etc. |
| `lib/persist.ts` | `assembleBundle`, `saveFounderScore`, `applyDeltaUpdates`, `saveAxisScores`, `applyValidations`, `savePlaybook`, `loadMemoInputs`, `saveMemo` |
| `lib/intel/evidence.ts` | `EvidenceBundle` (plain-data input), `renderEvidence`, `computeCoverage` |
| `lib/intel/band-math.ts` | Pure math: `bandFromSamples` (median + spread, coverage-widened), `compositeBand`, `medianIndex` |
| `lib/intel/visibility.ts` | Deterministic log-scaled Visibility Index (0-100) from meta counts + `parseVisibilityFromText` |
| `lib/intel/prompts.ts` | ALL prompt text: analyst system, 5 rubrics, screen, axes, validator, ambition, playbook, delta, adversarial, memo |
| `lib/intel/founder-score.ts` | 5 dims × 3 samples @ temp 0.8 → bands → composite + gap |
| `lib/intel/stages.ts` | screen · ambition read · axis scoring · validator · playbook · delta update |
| `lib/intel/memo.ts` | Adversarial pass + memo assembly (gaps, footnotes, decision, timer) |
| `lib/intel/pipeline.ts` | `runOpportunityPipeline`: the whole chain, DB-free |
| `scripts/test-unit.ts` | 64 pure-logic unit tests (band-math, visibility, coverage) |
| `scripts/test-intel.ts` | Live smoke test: ~20 LLM calls (`npm run test:intel`) |
| `scripts/test-pipeline.ts` | Full pipeline smoke test: ~28 LLM calls (`npm run test:pipeline`) |

## The clever parts

> [!important] Confidence bands via self-consistency
> Never ask a model "how confident are you" (badly calibrated). Run each dimension **3× at temperature 0.8**; the SPREAD is epistemic uncertainty. `value = median`, band = [min,max] widened by `(1 + 0.5 × (1 - coverage))`, min half-width 3. Coverage = 0.30·signalCount + 0.20·sourceDiversity + 0.20·verifiedShare + 0.15·specificityShare + 0.15·recencyScore (90-day half-life decay).

> [!important] Ambition & Drive read ([[research/founder-predictors]])
> Idea-agnostic, deliberately softer than the scored dims: ambition level, resourcefulness signals, learning velocity, persistence, **hype risk**, and `ideaAgnosticVerdict` — "would we back this person if this idea died?"

## Model tiers ($ control)

| Tier | Model | Used for |
|---|---|---|
| extract | gpt-4.1-nano | screen, extraction |
| score | gpt-4.1-mini | dimension sampling (needs `temperature`!), axes, validator, ambition, delta |
| heavy | gpt-4.1 | playbook, adversarial, memo |

## Hardening summary (8 phases)

| Phase | What it fixed | Impact |
|---|---|---|
| 1 | Unit tests for band-math, visibility, coverage | 64 tests, $0 cost regression suite |
| 2 | Pipeline resilience — `Promise.allSettled`, graceful degradation | No single stage failure kills the pipeline |
| 3 | Prompt refinement — adversarial structuring, calibration anchors | Better adversarial quality |
| 4 | Coverage formula — specificity, recency decay, minimum evidence floor | Honest uncertainty for sparse evidence |
| 5 | Delta update sophistication — `priorDeltaSummary` | Prevents redundant band adjustments |
| 6 | Memo quality — adversarial failure graceful degradation | Memo still generates if adversarial pass fails |
| 7 | ScoreHistory enrichment — `medianIndex` | Band-position context in rationale text |
| 8 | Full verification | All 64 tests pass, build clean |

## Verified live results (2026-07-19)

| Test | Result |
|---|---|
| Self-consistency spread | Execution samples 73/78/72 → band 74 [69-79] |
| Hidden-gem gap | Amara: composite 75, visibility 16 → **gap +58.6** |
| Validator on seeded contradiction | Priya $40K MRR → `contradicted`, trust 0, cites Product Hunt signal |
| Ambition contrast | Amara: low hype, `back_the_person` · Maxwell: **high hype**, no persistence, `depends_on_idea` |
| Full pipeline decision | Amara → `request_info` + 5 explicit gaps + playbook + 86.9h timer |
| Specificity normalization | `gpt-4.1-nano` returns invalid specificity → `z.string().transform()` normalizes to valid enum |
