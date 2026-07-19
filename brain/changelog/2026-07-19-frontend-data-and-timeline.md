---
tags: [changelog, track-b, track-c, data]
commit: pending
branch: track-d-sourcing
date: 2026-07-19
---

# Real Data in List Views + Simulated Timeline

> [!info] What happened (lead authorized the frontend touch)
> - `app/pipeline/page.tsx` + `app/dashboard/page.tsx`: hardcoded `sector: "Unknown"`, `track: "Unknown"`, `thesisFit: 0` replaced with real API fields; new shared `lib/thesis-fit.ts` (sector 60% + geography 40% graded fit); pipeline page now fetches `/api/thesis`.
> - `scripts/simulate-timeline.ts` (seeded/deterministic): opportunity ages spread 0-42 days recent-skewed; funnel mix now 25 DECIDED / 11 DILIGENCE / 4 SCREENED; decided deals got signal→decision times mostly under 24h (the brief's benchmark), with a few honest outliers.

Next: sourcing deep-dive (live scanner runs, outreach activation flow, conversion tracking).

Prev: [[2026-07-19-coverage-enrichment]]
