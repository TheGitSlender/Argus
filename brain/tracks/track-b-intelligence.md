---
tags: [track-b]
owner: Lead + Claude
branch: track-b-intel
updated: 2026-07-19
---

# Track B — Intelligence

Deep dive: [[intelligence-layer]] · research: [[research/founder-predictors]] · tasks: [[todo]]

## Status: 🟢 core engines done & live-tested · ⏳ persistence blocked on DB

| Done | Pending |
|---|---|
| Founder Score engine (bands) | Persistence layer (FounderScore/ScoreHistory/Claim writes) |
| Screen, 3 axes, Validator | API routes / server actions for Track C |
| Playbook, delta updates | Streaming memo endpoint |
| Adversarial + memo | Interview-notes → delta loop endpoint |
| Ambition & Drive read | NL query filter (cut-first) |
| Pipeline orchestrator | Founder Score persistence demo |

Smoke tests: `npm run test:intel` · `npm run test:pipeline` (live API, ~$0.10).
