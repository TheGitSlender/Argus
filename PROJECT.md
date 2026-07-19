# Argus — Project Description

> AI-first operating system for venture capital. Discovers exceptional founders, evaluates them with evidence-backed reasoning, and enables investors to make faster, more informed decisions.

---

## 1. Problem & Challenge

Capital in early-stage venture flows through networks, not merit. A founder's ability to get a meeting — let alone a check — depends largely on warm introductions, social proof, and visibility within a small circle of investors. This creates two compounding problems:

- **Missed talent.** The most capable founders — those building quietly without network access, press coverage, or social media presence — are systematically overlooked. High capability paired with low visibility is the exact profile that traditional VC pipelines fail to surface.
- **Slow, opaque diligence.** Evaluating a founder traditionally takes weeks of manual work: reading decks, running reference calls, cross-checking claims, and building internal memos. By the time a fund reaches a decision, the round has often closed — or the best candidates have accepted offers elsewhere.

The result is a market where capital allocation is driven by who you know, not what you can do — and where the diligence process is too slow and too subjective to keep pace with the speed at which early-stage companies are being built.

## 2. Target Audience

Argus is built for **early-stage venture capital investors** — specifically solo general partners, small fund teams (2–5 people), and scout networks who:

- Evaluate 50–200 inbound applications per quarter but lack the bandwidth to deeply diligence more than a fraction.
- Want to proactively source founders beyond their existing network but have no systematic way to discover, evaluate, and track them.
- Need to make faster investment decisions without sacrificing analytical rigor — particularly at pre-seed and seed stages where speed is a competitive advantage.
- Operate with constrained budgets and cannot justify hiring a full analyst team.

The system is also designed to serve the **founders themselves** — particularly those without network access — by ensuring their applications are evaluated on evidence and capability rather than connections.

## 3. Solution & Core Features

Argus automates the full venture capital lifecycle — **Sourcing → Screening → Diligence — Decision** — so a single investor can operate with the analytical reach of an entire firm.

### Inbound Intake
Founders submit a pitch deck and company information through a structured application form. The system extracts material claims, cross-references them against available evidence, and feeds them into the intelligence pipeline — no blank-page starting point, no deck-shaped guessing game.

### Outbound Sourcing & Activation
Actively scans GitHub and DevPost for promising founders, scores them against the fund's configurable thesis, and generates personalized outreach drafts. Every discovered founder enters the same evaluation pipeline as inbound applicants — the system converges both directions into one funnel.

### Living Founder Profile
Every signal — pitch deck, GitHub activity, interview notes, public record — updates a persistent Founder Score that follows the person across opportunities. Think of it as a credit score for founders: it never resets, it narrows as evidence arrives, and it updates with each new piece of information.

### 3-Axis Screening
Every opportunity is independently scored along three axes — **Founder**, **Market**, and **Idea-vs-Market** — each with trend direction and cited evidence. The axes are never averaged, because the investor needs to see where the model agrees and where it disagrees.

### Evidence-Backed Investment Memos
Investment memos are generated with per-claim trust scores, adversarial bear-case analysis, and explicit gap-flagging. Every claim traces to its source. Contradictions are surfaced before the investor ever sees the memo, not after.

### Thesis Lens
A configurable fund thesis — sectors, stage, geography, check size, risk appetite — acts as a filter across the entire system. Everything downstream is evaluated through the investor's own lens.

## 4. Unique Selling Proposition (USP)

**Capability ≠ Visibility.** Argus's core insight is that popularity signals (GitHub stars, followers, press coverage, social proof) measure network access, not ability. The system measures them separately and never lets visibility inflate capability scores. The **gap** between capability and visibility is itself the signal — it surfaces the underpriced founder that network-driven VC misses.

This is not a ranking of GitHub stars. It is a system that:

- **Scores the person, not the idea.** Startup ideas change; most successful companies pivot. Argus evaluates transferable qualities — determination, learning velocity, calibrated ambition, track-record persistence, resilience — that survive a pivot. The system explicitly avoids penalizing first-time founders or solo founders.
- **Ships honest confidence bands, not false precision.** Every score is a band whose width reflects genuine uncertainty. Wide bands are not failures — they are honest signals that trigger targeted interview questions to resolve the uncertainty.
- **Persists across opportunities.** A Founder Score follows the person. If a founder applies to Fund A, gets rejected, and later applies to Fund B — the accumulated evidence, score history, and verification status carry over. The system learns over time.
- **Logs everything, fabricates nothing.** Every LLM call is logged and auditable (ReasoningLog). Every claim traces to a signal, every signal has a source. Self-consistency sampling exposes guessing. Contradictions are caught by a Validator before the investor sees them.
- **Converges inbound and outbound.** Founders discovered through GitHub scanning enter the same pipeline as those who apply directly. If a discovered founder later applies, the system already knows them — score, history, evidence intact.

## 5. Implementation & Technology

### Architecture

| Layer | Purpose |
|-------|---------|
| **Memory** | PostgreSQL via Prisma — Founders, Companies, Opportunities, Signals, Claims, Scores, AxisScores, Outreach, Thesis, ReasoningLog |
| **Intelligence** | 5-dimension Founder Score (3x self-consistency sampling), 3-axis screening, claim validation, adversarial bear-case analysis, streaming memo generation |
| **Experience** | Next.js App Router with Dashboard (scatter chart, top pipeline), Pipeline (filterable table), Founder Profile (radar chart, dimensions, signal feed), Memo Generator (streaming), Sourcing (ranked outbound pool), Intake (application form), Settings (thesis config) |

### Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Database:** PostgreSQL (Neon) via Prisma 6
- **AI:** OpenAI API (GPT-4.1 family) through a single wrapper (`lib/llm.ts`) with caching, validation, and full reasoning log
- **Validation:** Zod schemas (`lib/contracts.ts`) shared between all pipeline stages
- **Styling:** Tailwind CSS v4 + custom "Milk & Energy" design system (Space Grotesk headings, Lora body, cream/rust palette)
- **Deployment:** Vercel

### Intelligence Pipeline (per opportunity)

```
Extract claims (nano) → Permissive screen (nano) →
  [Founder Score 5×3 samples ∥ Ambition read ∥ Claim validation] (mini) →
  [3 axes ∥ Interview playbook] →
  Adversarial bear case →
  Memo with decision + gaps + timer (gpt-4.1)
```

Bands are computed from sample spread and widened by evidence coverage. Delta updates adjust bands on each new signal without reprocessing the entire pipeline.

### Scale & Cost

- **64 scored founders** in production (41 synthetic corpus + 23 real GitHub discoveries + live intake tests)
- **~1,800 logged LLM calls**, fully traceable, at roughly **$15 total**
- Decisions instrumented from first signal to decision, mostly under 24 hours

## 6. Results & Impact

### What was built

A fully functional VC operating system that covers the end-to-end lifecycle from founder discovery to investment memo generation:

- **7 application screens** on live data: Dashboard, Pipeline, Founder Profile, Memo Generator, Sourcing, Intake, Settings — plus a Debug/ReasoningLog viewer.
- **14 API routes** covering inbound intake, outbound scanning, intelligence pipeline execution, memo generation, thesis configuration, and natural-language query.
- **14 database models** with append-only audit trails (ScoreHistory, ReasoningLog) and entity resolution via source+handle identity keys.
- **14 test suites** covering band math, visibility calculation, coverage metrics, pipeline integration, memo generation, and the full intelligence layer.

### Impact on the investment process

| Metric | Traditional | With Argus |
|--------|------------|------------|
| Time to first evaluation | Days to weeks | Minutes (automated pipeline) |
| Founders evaluated per dollar | Limited by analyst bandwidth | 100x at ~$15 total LLM cost |
| Source of signal | Network + deck polish | Evidence + capability signals |
| Cold-start fairness | Penalizes unknown founders | Wide honest bands, no network penalty |
| Auditability | Black-box human judgment | Every LLM call logged, every claim traceable |

### Research foundation

Argus's evaluation methodology is grounded in published research on founder success predictors — including work from Paul Graham/YC (determination as primary quality), Gompers et al. (JFE 2010, performance persistence in entrepreneurship), PNAS 2023 and Nature Scientific Reports 2023 (founder personality and resilience), and MIT Sloan (learning velocity as predictor). The system deliberately avoids penalizing solo founders, first-time founders, or traits with low predictive power — decisions documented in `docs/research/founder-predictors.md`.
