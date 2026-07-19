---
tags: [track-c]
owner: Lead + Claude
updated: 2026-07-19
---

# Track C — Experience

Status: 🟢 **Complete** — 6 pages, 10 shared components, Classical design system.

**Bar:** "Notion-level approachability, Bloomberg-level analytical depth." UX is 15% of scoring — real but smallest; never trade data/reasoning time for polish.

## Pages

| Route | Page | Hero element |
|---|---|---|
| `/` | Landing | Marketing page (no sidebar), nav, hero, how-it-works, CTA |
| `/dashboard` | Dashboard | **capability×visibility scatter**, "Hidden Gems" quadrant, ranked pipeline table, thesis panel |
| `/pipeline` | Pipeline | Sortable/filterable table, sector/track segmented controls, search |
| `/founders/[id]` | Founder Profile | Radar with band shading, 5 dimension cards with trends, signal feed with trust badges, dialogs |
| `/opportunities/[id]/memo` | Investment Memo | Streaming typewriter effect, markdown rendering, blinking cursor |
| `/intake` | Intake | Form with deck drag-and-drop upload, sector dropdown, submits to `POST /api/apply` |
| `/settings` | Settings | Thesis config — sector/stage/geography chips, check size, ownership % |

## Shared components (`app/components/`)

`AppLayout.tsx` · `Sidebar.tsx` · `ScoreBand.tsx` · `Tag.tsx` · `Dialog.tsx` · `TrendArrow.tsx` · `ScatterChart.tsx` · `RadarChart.tsx` · `SignalCard.tsx` · `DimensionCard.tsx`

## Design system

- **Palette:** Cream `#fdfaf0` / Rust `#A52700` / Orange `#EC5E27` ("Milk & Energy")
- **Fonts:** Space Grotesk (headings) + Lora (body)
- **CSS:** Full token system + component classes in `app/globals.css`
- **No component library** — pure CSS from the design canvas HTML files

## Architecture decisions

- All app pages are `"use client"` (fetch data on mount via `fetch()` to existing API routes)
- `AppLayout` wraps sidebar + main content; each page imports it directly
- Landing page has no sidebar (standalone marketing page)
- SVG charts implemented manually (Recharts installed but not used)
- `Shared file analysis/` folder deleted (design source files, gitignored)

## Build verification

- tsc clean, lint clean, build passes
- 17 routes: 6 static pages + 11 API routes (dynamic)
