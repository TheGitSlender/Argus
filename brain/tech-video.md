---
tags: [demo, video]
updated: 2026-07-19
---

# Tech Video Script — "How Argus Works"

Shot-by-shot for the technical explainer (~3-4 min). Companion: [[demo-script]] for the product demo. Everything referenced is real and live.

| # | ~s | On screen | Voice-over line |
|---|---|---|---|
| 1 | 20 | Dashboard scatter, cursor circling top-left quadrant | "Every founder here is plotted on two axes VC usually conflates: what they can do, and how visible they are. The top-left corner is where great founders go unseen — and it's what Argus is built to find." |
| 2 | 25 | [[architecture]] mermaid pipeline diagram | "One pipeline: a signal comes in — an application or a discovery — gets screened, scored, validated, and turned into a decision-ready memo. Three layers: Memory, Intelligence, Experience." |
| 3 | 25 | [[data-model]] ER diagram; highlight Signal→Claim, ScoreHistory, ReasoningLog | "Memory discards nothing. Raw signals are source-tagged and timestamped; claims are extracted with per-claim trust. Two tables are append-only from the first commit: every score change, every reasoning step, forever." |
| 4 | 40 | `lib/intel/founder-score.ts` + `band-math.ts` on screen; then Amara's radar with band shading | "The Founder Score never asks the model how confident it is — models can't self-report calibration. Each dimension runs three times at temperature 0.8; the SPREAD across runs is measured uncertainty, widened further when evidence coverage is thin. Every score is a band, and the band width is honest." |
| 5 | 25 | `prompts.ts` anti-visibility guardrail highlighted; `visibility.ts` | "Capability prompts are forbidden from reading popularity. Stars and followers go into a separate deterministic visibility index — used only to compute the gap that surfaces hidden gems." |
| 6 | 25 | Priya's memo, contradicted claim in red; `stages.ts` validator | "A deck claimed $40K MRR. The product launched three weeks earlier. The Validator cross-references every claim against every other signal and flags contradictions before an investor ever reads the memo." |
| 7 | 30 | Founder profile; POST interview notes; bands narrow, history pin appears | "Profiles are alive. Interview notes are just another signal: claims extract, only affected dimensions move, and the change is recorded with its cause. The interview is an evidence instrument." |
| 8 | 30 | Sourcing page + `keywords.ts` policy comment; live scan clicking | "Sourcing hunts early-stage activity — repos created within nine months, pushed within three weeks — with no popularity ceiling and no popularity reward. These are real founders, found today, scored exactly like applicants. Outreach is draft-only; a human decides." |
| 9 | 20 | /debug: totals cards + expanding a score row | "Every one of the system's reasoning steps is logged — model, inputs, output, tokens. The entire production run cost about fifteen dollars. That's the audit trail AND the economics." |
| 10 | 20 | Team Argus memo: composite 65.6, REQUEST_INFO | "We ran ourselves through it. It gave us honest bands, called our own deck slightly hypey, and asked us in for an interview. A system that won't blindly fund its creators is one an investor can trust." |

**Recording setup:** dev server or prod, tabs pre-opened in shot order; code shots from GitHub web UI (cleaner than editor); mermaid diagrams render in Obsidian — screen-record the brain pages themselves (bonus meta-story shot of the graph view).
