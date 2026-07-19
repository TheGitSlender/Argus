# ARGUS — Demo & Pitch Handoff

> Everything needed to record the demo video, build the deck, and answer judges.
> Prod: https://argus-one-ruby.vercel.app · Full audit vs the brief: `brain/objectives-audit.md`

---

## 1. What Argus is (the 30-second version)

Argus is a VC operating system that covers **Sourcing → Screening → Diligence → Decision** and can justify a $100K check within 24 hours. Its core thesis: **capability ≠ visibility**. Stars, followers, and press measure *network access*, not ability — so Argus measures them separately and ranks founders by the **gap**. High capability + low visibility = the underpriced founder every fund misses. Every score is a confidence *band* backed by cited evidence; every claim carries its own Trust Score; every LLM step is logged and auditable.

## 2. The numbers (say these out loud)

- **64 scored founders** in production: 41 corpus + **22 real founders discovered live on GitHub** + real intake tests
- **~1,800 logged LLM calls**, fully traceable, at roughly **$15 total** — that is the cost of an entire fund's diligence pipeline (see /debug for exact live numbers)
- Decisions instrumented signal→decision, **mostly under 24h** (visible per-memo)
- Founder Score: 5 dimensions × 3-sample self-consistency → honest confidence bands that **narrow as evidence arrives**

## 3. Demo script (~5 min) — beats in order

| # | Beat | How | The line to say |
|---|---|---|---|
| 1 | Thesis lens (15s) | Settings page — sectors/stage/geo/check size | "Everything downstream is filtered through the fund's own thesis." |
| 2 | Dashboard scatter (30s) | Point at top-left quadrant | "Capability vs visibility. Everyone in this corner is invisible to network-driven VC. The hype cases with max visibility? Bottom of our conviction ranking." |
| 3 | NL query (15s) | Type: `technical founder, hidden gems, ai-infra` → Enter | "One compound query, not five filters." |
| 4 | Hidden-gem profile (45s) | Open Amara Diallo (or Amina Kader) | "Every score is a band, not a number — the width is honest uncertainty, and the interview playbook targets exactly the widest bands." |
| 5 | **The living profile** (60s) | Founder profile → ingest interview notes (endpoint or UI) → bands narrow, history pin appears | "The investor did the call, pasted notes — watch Execution narrow. Interview-as-evidence-instrument." |
| 6 | Validator catch (20s) | Priya Raghavan's memo — $40K MRR claim flagged red | "The deck claims $40K MRR; the product launched 3 weeks ago. The Validator caught it before the investor ever saw the memo." |
| 7 | **Sourcing, live** (60s) | Sourcing page — ranked pool of REAL GitHub discoveries; optionally trigger a live scan | "These are real founders, found today, scored like applicants. Outreach is draft-only — a human decides." |
| 8 | **Convergence** (45s) | Helldez: outreach CONVERTED → his application → same profile, score intact | "We found him, drafted outreach, he applied — and the system already knew him. Score, history, evidence: all carried over. **The system didn't need him to know anyone.**" |
| 9 | Traceability close (20s) | /debug page | "Every one of ~1,800 reasoning steps, logged and auditable — and the entire pipeline cost about $15. That's 100× speed at 1000× lower cost." |

**Recording tips:** pre-load tabs in order; the interview-notes beat is the emotional peak — rehearse it twice; end on the /debug cost stat.

## 4. Pitch deck outline (10 slides, mapped to judging weights)

1. **Title** — Argus: the VC brain that finds founders before the network does.
2. **Problem** — capital flows through networks, not merit; diligence takes weeks; the best founders give up waiting.
3. **Thesis** — capability ≠ visibility (show the scatter). The gap IS the alpha.
4. **How it works** — 3 pillars diagram (Memory / Intelligence / Experience) + pipeline (use `brain/architecture.md` mermaid).
5. **Founder Score** — bands via self-consistency sampling; coverage-driven widening; radar + history chart screenshot. *(Data Architecture 30%)*
6. **Trust layer** — per-claim Trust Scores, Validator contradiction catch (Priya screenshot), gap-flagged memos. *(Analysis & Trust 25%)*
7. **Sourcing** — live GitHub discovery, capability-ranked, drafts-only activation, the Helldez convergence story. *(the brief's "most important part")*
8. **24h decision** — memo screenshot with decision block + signal→decision timer; cost-per-decision from /debug. *(Investment Utility 30%)*
9. **Equity outcome** — cold-start path: deck-only founder gets wide bands + an interview, never a silent rejection. "We denominate by opportunity, not by network."
10. **What's next** — channel-quality learning, external verification APIs, LinkedIn/Crunchbase production integrations (scope decisions, not ignorance).

## 5. Judge Q&A (rehearse — the brief's FAQ is the oral exam)

- **Founder Score vs 3-axis?** Score follows the person, persists, never resets; axes are per-deal; the score is one input into the founder axis. *(Demonstrated live via Helldez/Amara re-application.)*
- **Why not average the axes?** Averaging hides the disagreement the investor needs to see.
- **Cold start?** Deck-linguistics init + optional artifact link + wide honest bands + playbook engineered to resolve them. No solo/first-timer penalties — documented in `docs/research/founder-predictors.md`.
- **Aren't you just ranking GitHub stars?** No — stars are visibility, measured separately, and *never* enter capability. Discovery has no star ceiling either: real work with traction ranks highest; hype without work sinks on evidence density.
- **Hallucination control?** Scores cite claim IDs → claims cite signals → signals have sources; self-consistency spread exposes guessing; Validator cross-references; ReasoningLog shows every step.
- **What did you use Adaption for?** Be precise: credits went unused; the pure-LLM extraction path (the planned fallback) is what shipped.

## 6. Commands cheat sheet

```bash
npm run dev                       # local app
npx tsx --env-file=.env scripts/run-scan.ts            # live GitHub sourcing scan
npx tsx --env-file=.env scripts/batch-score.ts --all   # score all unscored founders
npm run test:unit && npm run test:track-a              # 93 tests
# live interview-notes ingestion (demo beat 5):
curl -X POST localhost:3000/api/founders/<id>/signals -H "Content-Type: application/json" \
  -d '{"source":"INTERVIEW","rawContent":"<paste notes>"}'
```

## 7. Honest gaps (if asked)

Channel-quality learning loop (tracked, not learned yet) · external market-DB verification (validator is cross-signal only) · Devpost scraping is bot-blocked (production integration, listed as such) · corpus data is labeled synthetic (by design; the 22 GitHub discoveries are real).
