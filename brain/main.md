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
| Phase | **FEATURE-COMPLETE — presentation prep.** All MVP reqs + stretch goals demonstrated ([[objectives-audit]]) |
| Branches | `main` (single trunk, all tracks merged) |
| Database | ✅ **Neon = canonical (prod)** — corpus imported (41 founders / 94 claims); local Postgres instances are per-dev scratch |
| Deployment | ✅ **Vercel live** — prod deploys `main`; 9 API routes + 6 frontend pages served |
| LLM runtime | ✅ OpenAI key active ($50 budget) — gpt-4.1-nano / mini / 4.1 tiers |
| Pipeline | ✅ **End-to-end live**: pipeline + persistence + interview loop + returning-founder + streaming memo + ReasoningLog traceability |
| Synthetic corpus | ✅ 36 profiles / 40 signals / 54 claims / 4 contradiction cases — integration-verified against live DB |
| UI | ✅ **Done** — 6 pages, 10 shared components, Classical design system (Milk & Energy palette) |
| Tests | ✅ **93 passing** — 64 intel unit tests + 29 track-a unit tests; tsc, lint, build clean |

> [!warning] Open: batch-score the 36 corpus profiles in prod (≈$5-15) — see [[changelog/2026-07-19-team-merge-review]]

## 🗺️ Map of this brain

- [[objectives-audit]] — **final compliance audit vs the brief**
- [[tech-video]] — shot-by-shot tech explainer script
- `DEMO_HANDOFF.md` (repo root) — product demo beats, deck outline, judge Q&A
- `HANDOFF.md` (repo root) — full application structure reference
- [[architecture]] — system design, pipeline flow, stack
- [[data-model]] — every table and *why* it exists
- [[intelligence-layer]] — Track B deep dive: engines, prompts, verified outputs
- [[decisions]] — the decision log (what we chose and why)
- [[todo]] — what is still needed, by track, with blockers
- [[glossary]] — project vocabulary (bands, gap, trust score…)
- [[research/founder-predictors]] — what actually predicts a good founder
- [[demo-script]] — the 5-minute demo beats
- Tracks: [[tracks/track-a-data]] · [[tracks/track-b-intelligence]] · [[tracks/track-c-experience]]
- Changelog: [[changelog/2026-07-18-foundation]] → [[changelog/2026-07-19-intelligence-layer]] → [[changelog/2026-07-19-memo-generator]] → [[changelog/2026-07-19-ambition-and-pipeline]] → [[changelog/2026-07-19-track-a-integration]] → [[changelog/2026-07-19-persistence-and-api]] → [[changelog/2026-07-19-db-live]] → [[changelog/2026-07-19-streaming-memo-and-scan]] → [[changelog/2026-07-19-all-tracks-merged]]

## 👥 Team & tracks

| Track | Owner | Scope | Status |
|---|---|---|---|
| B — Intelligence | Lead + Claude | Founder Score, axes, validator, memo, playbook | 🟢 **Complete** — 8 hardening phases + 10 targeted fixes merged |
| A — Data & Memory | Teammate 1 (Aress07) | Fetchers, synthetic corpus, entity resolution, claim extraction | 🟢 **Complete** — Gates 0-5 accepted, integration-verified |
| C — Experience | Lead + Claude | 6 pages, 10 components, Classical design system | 🟢 **Complete** — all pages, sidebar layout, streaming memo |

## 🎯 Evaluation weights (memorize)

| Criterion | Weight | Our answer |
|---|---|---|
| Data Architecture & Intelligence | 30% | Memory schema, coverage-driven bands, ingestion quality |
| Investment Utility & Execution | 30% | 24h-decision memo, signal→decision timer, playbook |
| Intelligent Analysis & Trust | 25% | Per-claim Trust Scores, validator, self-consistency bands |
| UX & Design | 15% | 6 screens, hidden-gems scatter hero, Classical design system |

> [!warning] Never cut (these ARE the thesis)
> Confidence bands · Hidden Gems view · Interview Playbook · memo gap-flagging.
> **Cut first if behind:** NL query → live outbound scanning → adversarial pass → timeline chart.

## 🔁 Brain workflow

> [!note] How this vault stays alive
> After **every commit**: add a note in `changelog/` (what was done, files, what's still needed, sources), link it here, and refresh the Status table above. [[todo]] is updated in the same pass. Graph view shows the project's shape — keep linking notes with `[[wikilinks]]`.
