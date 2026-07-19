---
tags: [changelog, track-d, sourcing, milestone]
commit: pending
branch: track-d-sourcing
date: 2026-07-19
---

# 🎉 First LIVE GitHub Sourcing Run

> [!info] What happened
> With a scopeless `GITHUB_TOKEN` (public read, 5K req/h), the outbound scanner ran against the real GitHub API and discovered **15 real founders** across ai-infra / devtools / applied-ai. Three were pipeline-scored to prove the loop; ranking now differentiates on capability.

## Scanner fixes required first

1. **Sector-slug mismatch**: keyword map keyed on pretty names ("AI infra") while the thesis stores slugs (`ai-infra`) — every query returned null. Lookup is now slug-normalized.
2. **Popularity-driven query (mission bug)**: `stars:>=50, sort=stars desc` chased already-visible repos. Now hidden-gem tuned: `topic:<keyword> created:>=270d pushed:>=21d stars:3..40 archived:false`, sort by recent activity. Low star *ceiling* — we exclude the visible instead of chasing them.
3. **GitHub repo search has no OR groups** — one query per topic keyword, merged per owner.
4. Intake reuse broadened: any non-DECIDED outbound opportunity absorbs re-scans (was SOURCED/SCREENED only → DILIGENCE deals got duplicated). Duplicate deals merged in prod.

## Live results

- 15 discoveries intaken (claims extracted, deals created, identities recorded).
- 3 scored end-to-end: Helldez composite 62.2 (gap +47), abhishek srivastava 55 (+49), RoyZhao1991 55 (+49) — all `substantial` ambition / low hype / REQUEST_INFO.
- Pool ranking: scored capability now dominates (rank 44-45 vs 15 for unscored) — running the pipeline earns rank, popularity never does.

## Still open (sourcing)

- Score remaining 12 discoveries (~$3) · activation flow (outreach drafts, status transitions) · conversion-back-to-inbound beat · Devpost scanner live test.

Prev: [[2026-07-19-frontend-data-and-timeline]] (also covers perf/UX commit `56cea12`)
