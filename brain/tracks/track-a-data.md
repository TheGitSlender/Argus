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

## Status update 2026-07-19: Gates 0-1 accepted 🟢

36-profile corpus shipped and **verified compatible** with Track B ([[changelog/2026-07-19-track-a-integration]]). Run the integration test on branch `integration/ab-test`: `npx tsx --env-file=.env scripts/integration/test-corpus-integration.ts`.

> [!todo] Integration feedback (from Track B)
> 1. **Evidence density on hidden gems:** 40 signals across 36 profiles ≈ 1.1 each → coverage 0.17-0.33 → wide bands everywhere. Honest for cold-starts, but hidden gems need 2-3 signals (build logs, technical notes) so their capability can score high with credible bands — they're the demo protagonists.
> 2. **Optional structured visibility meta:** we now parse "62,000 followers" from prose, but an optional strict `meta.visibility { followers?, stars?, pressMentions?, upvotes?, acceleratorTier? }` object would be cleaner and lets you express accelerator affiliation (currently impossible in prose parsing).
> 3. Hype-case visibility lands at 15-39 (vs 88 for our structured-meta fixture) — consider bigger/multiple visibility snapshots per hype profile so they visibly sink in the gap ranking.
