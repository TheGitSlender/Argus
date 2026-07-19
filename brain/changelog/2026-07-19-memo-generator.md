---
tags: [changelog, track-b]
commit: 4fd03b4
branch: main
date: 2026-07-19
---

# Memo Generator — `4fd03b4`

> [!info] Commit
> `feat: adversarial pass + investment memo generator with gap-flagging and claim footnotes` · 2026-07-19 00:18 · branch `main`

## What was done

- `lib/intel/memo.ts` — `adversarialPass` (skeptic bear case, evidence-cited) + `generateMemo` (5 required sections, optional sections only with evidence, `[claim:id]` footnotes, explicit `gaps[]`, decision invest/pass/request_info, thesis fit, signal→decision timer computed in code).
- Memo prompts added to `lib/intel/prompts.ts` (MEMO_SYSTEM encodes "padding counts against you" + never-fabricate rules).
- `scripts/fixtures.ts` extracted (shared Amara/Priya bundles); `scripts/test-memo.ts` isolates the 2 heavy calls.

## Verified live

Amara memo: gaps flagged exactly as the brief wants ("Cap table: not disclosed", "Financials: not disclosed"…), SWOT + hypotheses footnoted to claims/signals, bear case attacks pilot verification and generalization — all evidence-anchored.

## Still needed after this

Ambition research + pipeline orchestration → [[2026-07-19-ambition-and-pipeline]].

Prev: [[2026-07-19-intelligence-layer]] · Next: [[2026-07-19-ambition-and-pipeline]]
