---
tags: [changelog, track-b, track-d, demo]
commit: pending
branch: track-d-sourcing
date: 2026-07-19
---

# Live Batch Scoring — Filtering & Ranking Demonstrated

> [!info] What happened
> Fixed Track D's rank.ts (stars/followers removed from rankScore — capability + gap only; thesis matching wired). Then batch-scored 6 representative corpus founders through the full pipeline into prod (`npm run batch:score`).

## Results (9 scored founders total in prod)

- **Hype cases sink**: Blaise Sterling composite 37 (vis 38.8), Maxwell Sterling 36 (vis 88, gap −52) — bottom of conviction ranking despite maximum visibility.
- **Hidden gems top both rankings**: Leila Haddad +70.4 gap (a LIVE /api/scan discovery, not corpus!), Amina Kader +69.2, Amara +65.9.
- **Cold-start honesty**: Tomás band [33-75] — widest band in the table, exactly as designed.
- **Screen filtered 1**: Nadia Voss (contradiction archetype) rejected at screen.

## ⚠️ Tuning observation (for team)

The screen rejected the CONTRADICTION persona, calling it "fabricated" — partly because corpus rawContent literally says "Synthetic...". Two issues: (1) contradiction cases should reach the VALIDATOR (flag + REQUEST_INFO), not die at screen — that's the demo beat; (2) corpus "Synthetic" labels leak into prompts. Proposal: strip synthetic markers at renderEvidence time, and screen prompt gets "contradictory claims are the Validator's job, not yours".

Also minor: batch report shows axes -/-/- for founders whose LATEST opportunity has no axis rows (report script cosmetic, data is fine).

Prev: [[2026-07-19-team-merge-review]]
