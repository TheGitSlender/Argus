---
tags: [architecture]
updated: 2026-07-19
---

# Architecture

Part of [[main]] · details in [[data-model]] and [[intelligence-layer]].

## Stack

| Layer | Choice | Why (see [[decisions]]) |
|---|---|---|
| Web | Next.js 16 (App Router), TypeScript, Tailwind | Client constraint: Next.js, no Streamlit |
| DB | Postgres (Neon planned) + Prisma 6 | Battle-tested path under time pressure |
| LLM | OpenAI gpt-4.1 family via one wrapper (`lib/llm.ts`) | $50 user credits; `OPENAI_BASE_URL` swaps in open-source |
| Charts | Recharts (radar, timeline, scatter) | Track C |
| Batch data | Adaption Labs (Python, `/scripts/adaption/`) | ~2K credits; **never in request path** |

## Pipeline (the spine of the system)

```mermaid
flowchart TD
    A[Signal in - inbound application OR outbound scan] --> B[1. Extract claims - Track A]
    B --> C[2. Entity resolve via Identity table]
    C --> D[3. First-pass screen - permissive]
    D -->|reject| X[Stop: spam/incoherent only]
    D -->|proceed| E[4a. Founder Score: 5 dims x 3 samples -> bands]
    D -->|proceed| F[4b. Ambition & Drive read - idea-agnostic]
    D -->|proceed| G[4c. Validator: per-claim trust scores]
    E --> H[5. 3-axis scoring: founder / market / idea-vs-market]
    F --> H
    G --> H
    E --> I[6. Interview Playbook - targets widest bands]
    H --> J[7. Adversarial pass - bear case]
    I --> K[8. Memo assembly + decision + gaps + timer]
    F --> K
    J --> K
```

Stages 4a/4b/4c run **in parallel**, then 5 + 6 in parallel, then 7 → 8. Orchestrated by `lib/intel/pipeline.ts` (`runOpportunityPipeline`), which is **DB-free**: route handlers will wrap it with persistence.

## Layer boundaries

```mermaid
flowchart LR
    subgraph Memory
        S[Signal] --> CL[Claim]
        FS[FounderScore + history]
    end
    subgraph Intelligence
        P[pipeline.ts stages]
    end
    subgraph Experience
        UI[5 screens + /debug]
    end
    Memory --> Intelligence --> Experience
    Intelligence -- ReasoningLog: every LLM call --> Memory
```

**Iron rules:** every LLM call goes through `runLLM()` (the log IS traceability + cache) · `ScoreHistory`/`ReasoningLog` append-only · visibility never leaks into capability · axes never averaged.
