---
tags: [changelog, track-b]
commit: ebf541e
branch: main
date: 2026-07-19
---

# Intelligence Layer — `ebf541e`

> [!info] Commit
> `feat: intelligence layer — founder score engine with self-consistency bands, 3-axis scoring, validator, playbook, delta updates` · 2026-07-19 00:15 · branch `main`

## What was done

- `lib/intel/evidence.ts` — EvidenceBundle + `renderEvidence` + `computeCoverage` (0.45·count + 0.30·diversity + 0.25·verified).
- `lib/intel/band-math.ts` — pure band math: median, spread-as-band, coverage widening `(1 + 0.5(1−coverage))`, min half-width 3, composite.
- `lib/intel/visibility.ts` — deterministic log-scaled Visibility Index; `deriveVisibilityInputs` from signal meta.
- `lib/intel/prompts.ts` — analyst system w/ anti-visibility guardrail, 5 dimension rubrics, screen/axis/validator/playbook/delta prompts.
- `lib/intel/founder-score.ts` — 5 dims × 3 samples @ temp 0.8 (15 parallel calls) → bands → composite + gap.
- `lib/intel/stages.ts` — screen, axes, validator, playbook, delta update.
- `lib/llm.ts` made **fail-soft** without DB ([[decisions]] #7).
- `scripts/test-intel.ts` live smoke test.

## Verified live (real OpenAI calls)

- Amara: composite ~74, visibility 16 → gap ~58. Sample spread real after prompt fix (73/78/72).
- Validator caught Priya's contradiction → `contradicted`, trust 0, cited the Product Hunt signal (after status-rules tightening in prompts).
- Delta update: pilot-contract signal → execution 74→79, band narrowed.

## Calibration fixes made during testing

1. Added "integer resolution, don't default to multiples of 5" → restored sample spread.
2. Validator status rules: timeline-math contradictions must be `contradicted`, not `unverified`.
3. Playbook band-reduction format made descriptive.

## Still needed after this

Memo + adversarial pass → done in [[2026-07-19-memo-generator]].

Prev: [[2026-07-18-foundation]] · Next: [[2026-07-19-memo-generator]]
