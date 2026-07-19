---
tags: [changelog, track-b, track-d, data]
commit: pending
branch: track-d-sourcing
date: 2026-07-19
---

# Coverage Enrichment — Mean Coverage 0.19 → 0.46

> [!info] What happened
> `scripts/enrich-corpus.ts`: all 40 scored founders with <3 signals received one generated, archetype-consistent follow-up signal, ingested through the REAL pipeline (claim extraction → delta update → ScoreHistory with cause) with band widths recalibrated to the new deterministic coverage. 1 transient extract failure (Leila Mansouri) retried by hand. Every founder now has score-history events, so profile timelines show movement.

## Also fixed

- **Duplicate deals on re-scan**: `lib/sourcing/intake.ts` now attaches a re-scan of a known founder to their open OUTBOUND opportunity instead of creating a new company+opportunity per scan. Deleted Leila Haddad's duplicate empty opportunity from prod.

## 📌 For Track C — the "Unknown" columns

The API returns real data (`company.sector`, `opportunity.track`, timestamps). `app/pipeline/page.tsx` lines ~48-53 hardcode placeholders:
- `sector: "Unknown"` → `opp.company?.sector ?? "—"`
- `track: "Unknown"` → `opp.track`
- `thesisFit: 0` → sector ∈ active thesis `sectors` (fetch `/api/thesis`)
Same stubs exist in `app/dashboard/page.tsx` (`sector`, `thesisFit`). "0d" is correct — all opportunities were created today.

## 📌 For Track A — corpus v2 data shape

Leaks weren't caused by JSON-as-format; bookkeeping and evidence shared one bag. Recommendation: nest ALL bookkeeping under a single `meta.corpus{...}` key (synthetic flag, ingestionKey, archetype, contradiction roles) so prompt-side exclusion is structural instead of a blocklist. Evidence features (stars, followers, finishedProjects) stay top-level for the deterministic visibility index. Avoid `synthetic://` scheme in any URL rendered to prompts.

Prev: [[2026-07-19-full-corpus-scored]]
