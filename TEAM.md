# Argus — VC Brain · Team Plan

> Hack-Nation Challenge 02 (Maschmeyer Group). Read `VC_BRAIN_HANDOFF.md` + the
> challenge PDF for full context. This file is the operational split.

## Tracks

| Track | Owner | Scope |
|---|---|---|
| **B — Intelligence** | (lead) + Claude | Founder Score engine (5 dims × 3-sample self-consistency → bands), Visibility Index + capability−visibility gap, 3-axis scoring, Validator + Trust Scores, memo generator, Interview Playbook, delta-update loop |
| **A — Data & Memory** | teammate 1 | Adaption Labs spike (hour 0!), fetchers (GitHub, HN Algolia, Devpost, arXiv, Product Hunt), deck text extraction, claim extraction into `Signal`/`Claim`, **synthetic corpus owner** (30–40 profiles), entity resolution, seeding |
| **C — Experience** | teammate 2 | The 5 screens: thesis config, discovery dashboard (capability×visibility scatter = hero), founder profile (radar + timeline), memo view, intake. Plus `/debug` ReasoningLog viewer (traceability demo). Build against `npm run db:seed` data first |

## Getting started

```bash
git clone https://github.com/TheGitSlender/Argus && cd Argus
npm install
cp .env.example .env        # fill in DATABASE_URL + OPENAI_API_KEY (shared in group chat)
npm run db:push             # sync schema to the shared Postgres
npm run db:seed             # 4 demo founders so the UI has data immediately
npm run dev
```

## The Brain (Obsidian vault)

`brain/` is an Obsidian vault — open the folder in Obsidian for graph view. It is the project's living memory: `main.md` is the hub (project description + status), `changelog/` gets one note per commit (what was done, what's still needed, sources), plus decision log, todo board, and per-track notes. **After every commit, add a changelog note and refresh the status table in `main.md`.**

## Ground rules

1. **`lib/contracts.ts` and `prisma/schema.prisma` are frozen interfaces.** Announce any change in group chat BEFORE merging — all three tracks depend on them.
2. **`ScoreHistory` and `ReasoningLog` are append-only.** Never update/delete rows.
3. **Every LLM call goes through `runLLM()` in `lib/llm.ts`.** No direct OpenAI calls — the log IS the traceability stretch goal and the cache.
4. **Never rank by stars/followers.** Visibility is measured separately and must never leak into capability dimensions.
5. **Never fabricate.** Missing data gets an explicit gap flag ("Cap table: not disclosed") — the brief scores this HIGHER.
6. **Never average the 3 axes.** (Brief FAQ 5.)
7. Branch per track (`track-a-data`, `track-b-intel`, `track-c-ui`), merge to `main` at least every 3–4 hours, keep `main` deployable.
8. Nothing new after hour 21 — demo prep only.

## Never cut (these ARE the thesis)

Confidence bands · Hidden Gems view · Interview Playbook · memo gap-flagging.

**Cut first if behind:** NL query bar → live outbound scanning (pre-fetch instead) → adversarial pass → timeline chart.

## Env / accounts

- `DATABASE_URL` — one shared Neon (or Supabase) Postgres for the whole team
- `OPENAI_API_KEY` — shared ($50 budget; extraction=gpt-4.1-nano, scoring=gpt-4.1-mini, memo=gpt-4.1). Optional `OPENAI_BASE_URL` swaps in open-source models via any OpenAI-compatible endpoint
- `GITHUB_TOKEN` — Track A (higher rate limits)
- `ADAPTION_API_KEY` — Track A batch stage only, never in the request path
