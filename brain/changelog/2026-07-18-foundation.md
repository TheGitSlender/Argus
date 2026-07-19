---
tags: [changelog]
commit: b29fc57
branch: main
date: 2026-07-18
---

# Foundation — `b29fc57`

> [!info] Commit
> `feat: foundation — Next.js skeleton, Prisma schema, pipeline contracts, LLM wrapper, seed corpus, team plan` · 2026-07-18 23:39 · branch `main`

## What was done

- Scaffolded **Next.js 16** (App Router, TypeScript, Tailwind, ESLint) at repo root; production build verified.
- Wrote the complete **Prisma schema** ([[data-model]]): Founder, FounderScore, append-only ScoreHistory & ReasoningLog, Signal/Claim, AxisScore, InterviewQuestion, Thesis, Identity, Company/Opportunity.
- Froze **pipeline contracts** in `lib/contracts.ts` (zod): bands, extraction, screen, dimension samples, axes, validation, playbook, delta, memo, NL filter, thesis.
- Built `lib/llm.ts` — the single LLM wrapper (cache → call → validate+retry → log).
- `prisma/seed.ts`: 4 demo personas (hidden gem, hype case, inflated claimer with seeded $40K-MRR contradiction, cold-start student).
- `TEAM.md`: 3-track split, ground rules, never-cut list.
- Deps swapped Anthropic → **OpenAI** mid-scaffold per user ([[decisions]] #4, #5); Prisma pinned to v6 (#3).

## Still needed at that point

Database + deployment, everything in [[todo]], all of Tracks A/C, all intelligence stages.

## Sources

Challenge brief PDF + `VC_BRAIN_HANDOFF.md` (project root inputs, described in [[main]]).

Next: [[2026-07-19-intelligence-layer]]
