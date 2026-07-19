---
tags: [demo]
updated: 2026-07-19
---

# Demo Script (~5 min — this decides more than the code)

Beats, in order. Personas from `prisma/seed.ts` / `scripts/fixtures.ts`.

| # | Beat | Shows | Status |
|---|---|---|---|
| 1 | Set the thesis (20s) | Configurable fund lens | 🟢 `/settings` screen live |
| 2 | Dashboard scatter: **Maxwell (hype) ranked below Amara** | "High visibility, low evidence density" — the thesis in one frame | 🟢 `/dashboard` with scatter chart + pipeline table |
| 3 | Open cold-start student profile (Tomás) | Wide honest bands + what evidence would raise confidence | 🟢 `/founders/[id]` with radar, dimensions, signals |
| 4 | Memo streams in | Sections, trust footnotes, explicit gaps, bear case, **Interview Playbook** | 🟢 `/opportunities/[id]/memo` streaming typewriter |
| 5 | "Investor did the call" — paste notes → **bands narrow live** → history pin → memo revises | The living profile, mechanically proven | 🟢 `POST /api/founders/[id]/signals` + delta engine |
| 6 | Priya (15s): Validator caught the $40K-MRR contradiction → red flag → Request-info | Trust layer | 🟢 engine verified |
| 7 | Close: Founder Score persistence (re-application starts stronger) + line: *"The system didn't need her to know anyone — it needed one artifact and twenty minutes."* | Equitable-detection mission | 🟢 persistence live, returning-founder verified |
| 8 | Point at signal→decision elapsed timer on exit | Speed instrumentation (scored!) | 🟢 computed in memo |

## Demo data

- 4 seeded personas via `npm run db:seed`: Amara (hidden gem), Maxwell (hype), Priya (contradiction), Tomás (cold start)
- 36 synthetic profiles from Track A corpus (additional depth)
- Full pipeline runs available for all demo profiles

## Run the demo

```bash
# Start local DB (if not running)
docker start argus-postgres

# Seed demo data
npm run db:seed

# Start dev server
npm run dev

# Open http://localhost:3000
```

Rehearsal checklist in [[todo]]. Judge Q&A prep lives in `VC_BRAIN_HANDOFF.md` §8.
