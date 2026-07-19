---
tags: [changelog, track-d, demo]
commit: pending
branch: track-d-sourcing
date: 2026-07-19
---

# Channel Quality Card + Argus Judges Itself

## Channel quality (stretch goal 3, now demonstrated)

`GET /api/sourcing` now returns per-channel funnel stats (found → drafted → converted, conversion %, avg capability); rendered as a card on the Sourcing page. GitHub shows a real conversion (Helldez).

## The self-application (demo beat: "fund yourselves")

Team Argus submitted through its own intake (real repo as artifact, honest deck). Verdict:
- Composite **65.6 [59.2-69.4]**, visibility 0 → **gap +65.6** — the team is a hidden gem in its own system.
- Ambition `transformative`, hype risk `medium` (fair — a pitch IS hype-adjacent), `back_the_person`.
- **Decision: REQUEST_INFO** — "anonymous team, no post-hackathon validation… proceed to interview." The system did NOT flatter its creators; it asked for diligence. That is the integrity story.
- In prod DB as "Team Argus / Argus" — re-applying with the same email during the demo shows `returningFounder: true`.

Also: NL query bar + /debug viewer shipped earlier this session (`5374adf`).

Prev: [[2026-07-19-sourcing-complete]]
