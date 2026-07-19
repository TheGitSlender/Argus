---
tags: [track-a]
owner: Teammate 1
updated: 2026-07-19
---

# Track A — Data & Memory

Status: ⚪ **not started** · tasks in [[todo]] · target tables in [[data-model]] (`Signal`, `Claim`, `Identity`)

> [!important] Start with the Adaption Labs spike (1 hour, hour 0)
> upload test file → `run(estimate=True)` → real run → download → record credit burn. Docs: https://docs.adaptionlabs.ai/ · ~2,000 credits available · batch-only, never in the request path, pure-OpenAI fallback behind a flag.

Priorities: fetchers (GitHub quality-not-stars, HN Algolia, Devpost, arXiv, Product Hunt) → deck extraction → claim extraction filling `Signal`/`Claim` (shapes in `lib/contracts.ts`) → **synthetic corpus (30-40 profiles, one owner, versioned)** → entity resolution.

The corpus must span the capability×visibility grid: hidden gems, hype cases, seeded contradictions, cold-start students ([[glossary]]).
