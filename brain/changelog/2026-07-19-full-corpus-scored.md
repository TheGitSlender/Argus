---
tags: [changelog, track-b, milestone, demo]
commit: pending
branch: track-d-sourcing
date: 2026-07-19
---

# 🎉 Full Corpus Scored — 41 Founders Live in Prod

> [!info] What happened
> `batch:score --all` completed: every founder in the shared Neon DB now has a full Founder Score, axes, playbook, and memo. Total decisions: 39 REQUEST_INFO · 1 PASS (Farah Nasser, composite 33 — the system can say no) · 1 initially screened.

## Signal quality of the run

- Conviction spread 28–72.6; hidden gems dominate the top (Amara 72.6, Leila Haddad 70.4 — a real /api/scan discovery, Amina 69.2); hype cases at the bottom on capability (Blaise 37, Maxwell 36, Sloane 28) despite visibility up to 88.
- **Contradiction persona fixed**: Nadia Voss now passes screen and reaches the Validator (REQUEST_INFO), restoring demo beat 6.
- **Second corpus leak found & fixed**: `synthetic://` sourceUrls were reaching prompts (screen rejected Sloane citing "synthetic visibility snapshot"). URLs with that scheme are now hidden at render time; Sloane rescored on merit.
- UI: scatter points now navigate to founder profiles on click; only scored founders plotted.

## ⚠️ Open: production website 500s

Both DB and OpenAI routes fail on Vercel while working locally → env vars (`DATABASE_URL`, `OPENAI_API_KEY`) missing/mis-scoped in the deployment. Fix is user-side: Settings → Environment Variables → ensure Production scope, no quotes → Redeploy. Data is ready and waiting in Neon.

Prev: [[2026-07-19-live-batch-scoring]]
