# Argus

AI-first operating system for venture capital. Discovers exceptional founders, deploys capital at 100x speed, and supports the next generation of AI entrepreneurs.

## What it does

Argus automates the full VC lifecycle — **Sourcing → Screening → Diligence → Decision** — so a single investor can operate with the reach of an entire firm.

- **Inbound intake**: founders submit a pitch deck and company name; the system extracts claims, scores the founder across 5 dimensions, validates evidence, and produces an investment memo — all within 24 hours.
- **Outbound sourcing** *(planned)*: actively scans GitHub and DevPost for promising founders, ranks them against the fund thesis, and generates personalized outreach drafts.
- **Living founder profile**: every signal (deck, GitHub activity, interview notes) updates a persistent Founder Score that follows the person across opportunities — a credit score for founders that never resets.
- **3-axis screening**: every opportunity is scored along Founder, Market, and Idea-vs-Market independently — never averaged — with trend direction and cited evidence.
- **Evidence-backed memos**: investment memos with per-claim trust scores, adversarial bear-case analysis, and explicit gap-flagging. Every claim traces to its source.

## Architecture

| Layer | Purpose |
|-------|---------|
| **Memory** | PostgreSQL via Prisma — Founders, Companies, Opportunities, Signals, Claims, Scores |
| **Intelligence** | 5-dimension Founder Score (3x self-consistency sampling), 3-axis screening, claim validation, adversarial pass |
| **Experience** | Next.js app with Dashboard, Pipeline, Founder Profile, Memo Generator, Intake, Settings |

## Stack

Next.js 16, Prisma, PostgreSQL, OpenAI API (GPT-4.1 family), Tailwind CSS, Zod contracts.

## Getting started

```bash
npm install
npx prisma db push
npx prisma db seed    # loads 4 demo founder personas + thesis
npm run dev
```



### Environment variables

```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

### Scripts

```bash
npm run dev           # development server
npm run build         # production build
npm run lint          # eslint
npm run test:unit     # pure-logic unit tests (band-math, visibility, coverage — $0)
npm run test:intel    # LLM smoke test (screen → score → validate → memo)
```

## Project structure

```
app/
  dashboard/          Main dashboard (scatter chart, top pipeline, thesis)
  pipeline/           Full filterable pipeline table
  founders/[id]/      Founder profile (radar chart, dimensions, signals)
  opportunities/[id]/memo   Streaming investment memo generator
  intake/             Founder application form
  settings/           Thesis configuration
  components/         Shared UI components
  api/                API routes
lib/
  intel/              Intelligence layer (scoring, validation, prompts, pipeline)
  sourcing/           Outbound scanning and activation (planned)
  contracts.ts        Shared Zod schemas between all stages
  llm.ts              Single LLM wrapper with caching + reasoning log
prisma/
  schema.prisma       Database schema (13 models, 9 enums)
brain/                Internal documentation and planning
```
