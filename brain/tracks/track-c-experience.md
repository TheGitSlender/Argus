---
tags: [track-c]
owner: Teammate 2
updated: 2026-07-19
---

# Track C — Experience

Status: ⚪ **not started** · tasks in [[todo]] · demo beats in [[demo-script]]

**Bar:** "Notion-level approachability, Bloomberg-level analytical depth." UX is 15% of scoring — real but smallest; never trade data/reasoning time for polish.

| Screen | Hero element |
|---|---|
| Thesis config | The fund lens (demo beat 1) |
| Discovery dashboard | **capability×visibility scatter**, "Hidden Gems" quadrant label, ranked table w/ 3 axis trends |
| Founder profile | Radar with band shading + score timeline w/ evidence pins + trust badges (🟢🟡🔴) |
| Memo view | Streaming generation, claim footnote click-throughs, gaps, playbook |
| Intake | Deck + company name + optional "link to anything you've made" |

Plus `/debug` early: raw pipeline runs + ReasoningLog viewer — saves debugging hours AND is the traceability demo.

Build against `npm run db:seed` data (4 personas ready). Contracts in `lib/contracts.ts`. Recharts for radar/timeline/scatter.
