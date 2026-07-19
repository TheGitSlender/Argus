---
tags: [changelog, track-b, research]
commit: 8a807eb
branch: track-b-intel
date: 2026-07-19
---

# Ambition Research + Pipeline — `8a807eb`

> [!info] Commit
> `feat: founder-predictor research + idea-agnostic Ambition & Drive read + full pipeline orchestrator` · 2026-07-19 00:53 · branch `track-b-intel` (first commit on the feature branch)

## What was done

- **Web research** on founder-success predictors → `docs/research/founder-predictors.md` + summary note [[research/founder-predictors]]. Motivation from the lead: *ideas change; we need to see true ambition, less strict than the Founder Score.*
- New **Ambition & Drive read** stage (`readAmbition` in `lib/intel/stages.ts`, `ambitionReadSchema` in contracts): ambition level, resourcefulness signals, learning velocity, persistence evidence, hype risk, `ideaAgnosticVerdict`.
- Schema: additive nullable `FounderScore.ambitionRead` (announced interface change).
- Rubrics upgraded: Resourcefulness → "relentlessly resourceful" obstacle→workaround evidence; Momentum → learning velocity; analyst system → "transferable qualities outlive the idea"; playbook → idea-agnostic ambition probe when drive unclear.
- **`lib/intel/pipeline.ts`** — `runOpportunityPipeline`: screen → (score ∥ ambition ∥ validations) → (axes ∥ playbook) → adversarial → memo. DB-free.
- Fixtures + `scripts/test-pipeline.ts` (`npm run test:pipeline`); Maxwell hype-case bundle added.

## Verified live

- Amara: ambition `substantial`, hype `low`, **`back_the_person`**; full pipeline → `request_info` + 5 gaps + 4 playbook questions + 86.9h timer.
- Maxwell (hype case): ambition `transformative` BUT hype `high`, persistence `[]`, **`depends_on_idea`** — the discrimination works.

## Still needed after this

See [[todo]] — persistence + routes (blocked on DB), streaming memo, interview-notes loop, NL query.

## Sources

Full list with links in [[research/founder-predictors]].

Prev: [[2026-07-19-memo-generator]]
