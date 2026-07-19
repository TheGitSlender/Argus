# What Actually Predicts a Good Founder?

> Research basis for Argus's founder evaluation — and for the **Ambition & Drive
> read**, our idea-agnostic founder assessment. Relevant to the brief's Area of
> Research 3 (public footprints → founder success) and FAQ 10/11 (cold start).

## The premise

Startup ideas change; most successful companies pivot. So a founder evaluation
that leans too hard on the *current idea's* traction rebuilds two biases at
once: it punishes early founders (cold start) and it measures the idea, not the
person. The evidence below is filtered for **transferable qualities — things
that survive a pivot** — and for **observability from a public footprint**
(we can only score what we can see in decks, repos, launches, and writing).

## Evidence-backed predictors

| # | Predictor | Evidence | Observable proxy in our data |
|---|---|---|---|
| 1 | **Determination / relentless resourcefulness** | Paul Graham/YC: above an intelligence threshold, determination is the single most important founder quality; "relentlessly resourceful" is the two-word definition of a good founder | Obstacle-workaround stories in blogs/commits; shipped despite constraints (day job, no funding); persistence through visible setbacks |
| 2 | **Learning velocity / iteration speed** | Pre-seed investor consensus (CRV, VC Cafe, Founder Institute): "what you tried, what failed, what changed" signals maturity more than polish; execution + learning velocity beat concept elegance | Changelog cadence; version history with *stated reasons* for changes; pivots framed as learnings; time between iterations shrinking |
| 3 | **Calibrated ambition (vs. hype)** | Fundraising-confidence research: real ambition = explain the big goal clearly *without* hype, discuss risk honestly, see both the size of the opportunity and the difficulty of the path | Deck linguistics: transformative goal + concrete next step + named risks. Hype marker: big adjectives, no falsifiable near-term commitments |
| 4 | **Track-record persistence** | Gompers, Kovner, Lerner & Scharfstein (JFE 2010): previously-successful entrepreneurs succeed at 34% vs. 22% for first-timers; skill (incl. market timing) persists | Prior shipped projects, prior exits/wins of any size — including hackathons and side projects |
| 5 | **Resilience & stress tolerance** | Founder-personality studies (PNAS 2023, Nature Sci Reports 2023): emotionally resilient founders fare better across ALL venture stages; VC Factory: resilience (recovery behavior) beats raw grit | Continued cadence *after* a failure event; public post-mortems; re-application after rejection |
| 6 | **Trait profile (weak but real)** | Big Five meta-research: openness-to-adventure, activity/energy, self-efficacy distinguish founders; but personality explains only ~10% of variance in entrepreneurial performance (60 studies, 15K entrepreneurs) | Energy/agency in writing voice — used ONLY as a weak, wide-band signal, never a gate |

## What we deliberately do NOT adopt

- **Team-size penalty.** Studies find 3+ founder teams succeed ~2× more than solo
  founders — but penalizing solo founders punishes exactly the un-networked
  cold-start founder this system exists to find. We surface team composition as
  a *risk flag in the memo*, never as a capability discount.
- **Personality testing from text.** We will not cosplay a Big Five assessment
  from a pitch deck; at ~10% explained variance it earns at most a weak,
  wide-band input. Trait words appear only as cited evidence, not scores.
- **First-time-founder penalty.** Track record (predictor 4) is a *positive*
  signal when present; its absence is uncertainty, never a demerit (FAQ 10).
- **Conscientiousness as uniformly good.** The Columbia/PNAS data shows highly
  conscientious founders raise early money more easily but are *less* likely to
  reach high-growth exits — a reminder that single-number scores mislead, which
  is why every dimension ships as a band.

## How this wires into Argus

1. **Ambition & Drive read** (`lib/intel/stages.ts → readAmbition`): a separate,
   deliberately *less strict* qualitative read — ambition level, resourcefulness
   signals, learning velocity, persistence evidence, and a hype-risk rating
   (predictor 3 is precisely the capability≠visibility split applied to
   language). Idea-agnostic by construction: it asks "would we still want to
   back this person if this exact idea died?"
2. **Scored dimensions updated**: Resourcefulness rubric now encodes
   "relentlessly resourceful" (predictor 1); Momentum now reads learning
   velocity, not just output recency (predictor 2).
3. **Interview Playbook**: when ambition signals are unclear or hype-suspicious,
   the playbook must include one idea-agnostic ambition probe.
4. **Memo**: the ambition read feeds Investment Hypotheses and the team section;
   solo-founder and first-time-founder facts appear as flagged risks/gaps, not
   score deductions.

## Sources

- [Paul Graham — Relentlessly Resourceful](https://www.paulgraham.com/relres.html)
- [Gompers, Kovner, Lerner, Scharfstein — Skill vs. Luck in Entrepreneurship (NBER w12592)](https://www.nber.org/papers/w12592)
- [Performance Persistence in Entrepreneurship (JFE 2010, HBS)](https://www.hbs.edu/faculty/Pages/item.aspx?num=37618)
- [The impact of founder personalities on startup success — Nature Scientific Reports (2023)](https://www.nature.com/articles/s41598-023-41980-y)
- [Founder personality and entrepreneurial outcomes — PNAS (2023)](https://www.pnas.org/doi/10.1073/pnas.2215829120)
- [Columbia Business School — How Founder Personalities Shape Venture Outcomes](https://business.columbia.edu/research-brief/research-brief/startups-founder-personalities-vc)
- [Oxford Internet Institute — Personality of founders could predict start-up success](https://www.oii.ox.ac.uk/news-events/personality-of-founders-could-predict-start-up-success-finds-new-study/)
- [MIT Sloan — 2 strong predictors of startup success](https://mitsloan.mit.edu/ideas-made-to-matter/2-strong-predictors-startup-success)
- [VC Cafe — Betting on People: What VCs Look for at the Pre-Seed Stage](https://www.vccafe.com/betting-on-people-what-vcs-look-for-at-the-pre-seed-stage/)
- [CRV — What Seed Investors Look For](https://www.crv.com/content/what-seed-investors-look-for)
- [Founder Institute — What Investors in Silicon Valley Are Really Looking For](https://fi.co/insight/what-investors-in-silicon-valley-are-really-looking-for-in-2026)
- [The VC Factory — Resilience Matters More Than Grit](https://thevcfactory.com/resilience-grit-entrepreneurs/)
