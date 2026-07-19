---
tags: [hub]
created: 2026-07-19
updated: 2026-07-19
---

# Argus — The VC Brain

> [!abstract] What this project is
> **Argus** is our entry for Hack-Nation Challenge 02 (Maschmeyer Group): *"The VC Brain — Deploying $100K Checks in 24 Hours."* An AI-first VC operating system covering **Sourcing → Screening → Diligence → Decision**, built on three pillars: **Memory** (nothing discarded, everything source-tagged), **Assessment & Intelligence** (transparent reasoning with confidence bands), and **Experience** (investor-grade UX).
>
> **Our differentiating thesis:** capability ≠ visibility. Stars, followers, and press measure *network access*, not ability. We measure them separately and rank founders by the **gap** — high capability + low visibility = the underpriced "hidden gem" the judges want found.

## 📊 Status — 2026-07-19

| Field | Value |
|---|---|
| Phase | Intelligence layer live-tested · Track A corpus shipped & integration-verified |
| Branches | `main` · `track-b-intel` · `track-a-data` (Gates 0-1 ✅) · `integration/ab-test` (A+B merged, tests pass) |
| Database | ❌ Not yet created (Neon planned) — **blocking** persistence + routes |
| Deployment | ❌ Vercel not yet connected |
| LLM runtime | ✅ OpenAI key active ($50 budget) — gpt-4.1-nano / mini / 4.1 tiers |
| Pipeline | ✅ Full run verified · ✅ Track A corpus flows into it (36 profiles → bundles) |
| Synthetic corpus | ✅ 36 profiles / 40 signals / 54 claims / 4 contradiction cases (Track A) |
| UI | ❌ Not started (Track C) |

## 🗺️ Map of this brain

- [[architecture]] — system design, pipeline flow, stack
- [[data-model]] — every table and *why* it exists
- [[intelligence-layer]] — Track B deep dive: engines, prompts, verified outputs
- [[decisions]] — the decision log (what we chose and why)
- [[todo]] — what is still needed, by track, with blockers
- [[glossary]] — project vocabulary (bands, gap, trust score…)
- [[research/founder-predictors]] — what actually predicts a good founder
- [[demo-script]] — the 5-minute demo beats
- Tracks: [[tracks/track-a-data]] · [[tracks/track-b-intelligence]] · [[tracks/track-c-experience]]
- Changelog: [[changelog/2026-07-18-foundation]] → [[changelog/2026-07-19-intelligence-layer]] → [[changelog/2026-07-19-memo-generator]] → [[changelog/2026-07-19-ambition-and-pipeline]] → [[changelog/2026-07-19-track-a-integration]]

## 👥 Team & tracks

| Track | Owner | Scope | Status |
|---|---|---|---|
| B — Intelligence | Lead + Claude | Founder Score, axes, validator, memo, playbook | 🟢 Core done |
| A — Data & Memory | Teammate 1 (Aress07) | Fetchers, Adaption spike, synthetic corpus, ingestion | 🟢 Gates 0-1 done (corpus shipped) |
| C — Experience | Teammate 2 | 5 screens, /debug viewer | ⚪ Not started |

## 🎯 Evaluation weights (memorize)

| Criterion | Weight | Our answer |
|---|---|---|
| Data Architecture & Intelligence | 30% | Memory schema, coverage-driven bands, ingestion quality |
| Investment Utility & Execution | 30% | 24h-decision memo, signal→decision timer, playbook |
| Intelligent Analysis & Trust | 25% | Per-claim Trust Scores, validator, self-consistency bands |
| UX & Design | 15% | 5 screens, hidden-gems scatter hero |

> [!warning] Never cut (these ARE the thesis)
> Confidence bands · Hidden Gems view · Interview Playbook · memo gap-flagging.
> **Cut first if behind:** NL query → live outbound scanning → adversarial pass → timeline chart.

## 🔁 Brain workflow

> [!note] How this vault stays alive
> After **every commit**: add a note in `changelog/` (what was done, files, what's still needed, sources), link it here, and refresh the Status table above. [[todo]] is updated in the same pass. Graph view shows the project's shape — keep linking notes with `[[wikilinks]]`.
