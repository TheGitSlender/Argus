---
tags: [decisions]
updated: 2026-07-19
---

# Decision Log

Every consequential choice, newest first. Context in [[main]].

| # | Date | Decision | Why | Revisit if |
|---|---|---|---|---|
| 10 | 07-19 | Ambition & Drive read as a SEPARATE softer stage, not a 6th scored dimension | Ideas change; person persists. Keeps the strict 5-dim score intact while capturing "true ambition" ([[research/founder-predictors]]) | Judges want it folded into the score |
| 9 | 07-19 | No solo-founder or first-timer penalty despite 2× team-success data | Penalizing solo/unknown founders rebuilds the network-gated bias the challenge exists to kill; surfaced as memo risk flag instead | — (mission-locked) |
| 8 | 07-19 | Work on feature branch `track-b-intel` | Parallel tracks without stepping on main | — |
| 7 | 07-18 | Fail-soft ReasoningLog (warn once, keep running) when DB absent | DB creation deferred by team; pipeline testable with key only | Remove warning once Neon exists |
| 6 | 07-18 | JSON-mode + zod parse + 1 retry (not strict json_schema API) | Works on ANY OpenAI-compatible endpoint incl. open-source servers | Malformed-JSON rate grows |
| 5 | 07-18 | gpt-4.1 family (nano/mini/full), NOT gpt-5 reasoning models | Bands need `temperature` sampling; gpt-5 reasoning models don't support it. 4.1-mini is cheap + capable | Budget pressure → drop tiers via env |
| 4 | 07-18 | OpenAI instead of Anthropic; `OPENAI_BASE_URL` escape hatch | User has $50 OpenAI credits; base-URL swap enables Groq/Ollama open-source with zero code change | — |
| 3 | 07-18 | Prisma 6, not 7 | v7 changed config/generator/adapters; v6 is the boring path everyone knows under hackathon pressure | Post-hackathon |
| 2 | 07-18 | Score bands stored as JSON `{value,low,high,coverage}` not columns | 5 dims × 4 fields = 20 columns of noise; zod validates shape; band metadata can evolve without migrations | Query-heavy analytics on bands |
| 1 | 07-18 | `ScoreHistory` + `ReasoningLog` append-only from commit #1 | The one thing that can't be retrofitted (handoff §6.1); powers trends, traceability, cache | — (locked) |

Earlier scope decisions inherited from the handoff: skip LinkedIn/Crunchbase/X scraping · Adaption Labs = batch-only with fallback · no trained ML recommender · no downstream stages (portfolio/exit).
