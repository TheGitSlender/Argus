---
tags: [track-d]
owner: malakmekyassi
updated: 2026-07-19
---

# Track D — Outbound Sourcing & Activation

Status: 🔵 **Planned** — Implementation not started.

## Goal

Build the sourcing layer: a system that actively scans external platforms (GitHub, DevPost) for promising founders, surfaces them in a ranked list, and enables investors to activate the strongest matches through personalized outreach — all feeding into the same inbound funnel.

## Data Flow

```
GitHub / DevPost scanners
        |
  lib/sourcing/intake.ts  (shared outbound intake logic)
        |
  POST /api/sourcing/scan  (triggers scan, creates Founder + Opportunity + Signal + Claims)
        |
  POST /api/sourcing/[id]/activate  (creates Outreach record, generates LLM draft message)
        |
  /sourcing page  (shows ranked discovered founders with status tracking)
```

## Database Changes

### New enum: `OutreachStatus`

```prisma
enum OutreachStatus {
  IDENTIFIED
  DRAFTED
  SENT
  REPLIED
  CONVERTED
  DECLINED
  EXPIRED
}
```

### New model: `Outreach`

```prisma
model Outreach {
  id              String          @id @default(cuid())
  opportunityId   String          @unique
  opportunity     Opportunity     @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  status          OutreachStatus  @default(IDENTIFIED)
  draftMessage    String?         @db.Text
  reason          String?         @db.Text
  sentAt          DateTime?
  repliedAt       DateTime?
  convertedAt     DateTime?
  notes           String?         @db.Text
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([status])
}
```

### Modified model: `Opportunity`

```prisma
model Opportunity {
  // ... existing fields ...
  outreach        Outreach?
}
```

**Key decisions:**
- `opportunityId` is `@unique` — one outreach attempt per opportunity, preventing duplicates
- `reason` stores why the founder was surfaced (e.g., "847-star repo, 12 commits in last 7 days, matches thesis sector")
- Timestamps track conversion speed (a metric the brief cares about)

## Library Modules

### `lib/sourcing/keywords.ts` — Sector-to-keyword mapping

Maps thesis sector names to GitHub search keywords:

```typescript
const SECTOR_KEYWORDS: Record<string, string[]> = {
  "Developer tools": ["cli", "devtools", "developer-tools", "ide", "code-editor"],
  "AI infra": ["llm", "inference", "vector-database", "ai-infrastructure", "ml-ops"],
  "Vertical SaaS": ["saas", "vertical-saas", "b2b", "enterprise"],
  "Fintech infra": ["fintech", "banking-api", "payment-processing", "ledger"],
  "Healthtech": ["healthtech", "medical-ai", "health-data"],
  "Climate tech": ["climate-tech", "carbon", "sustainability", "green-ai"],
  "Consumer": ["consumer", "social", "mobile-app"],
};
```

### `lib/sourcing/github.ts` — GitHub Scanner

**Function:** `scanGitHub(thesis: Thesis): Promise<DiscoveredFounder[]>`

**Algorithm:**
1. Read the active thesis from the DB
2. For each sector in `thesis.sectors`, construct a GitHub search query:
   - Map sector names to search keywords via `SECTOR_KEYWORDS`
   - Append date filter: `created:>={30 days ago}` to find recent projects
   - Append star filter: `stars:>=50` to skip trivial repos
   - Sort by stars descending (`sort=stars&order=desc`)
3. For each matching repo (up to 20 per sector):
   - Fetch repo owner details: `GET /users/{owner}`
   - Extract: name, login, bio, blog, location, public_repos, followers, created_at
   - Build a `rawContent` string summarizing the repo: name, description, stars, language, topics, created date, owner bio
   - Map to the `/api/scan` input shape
4. POST each to the shared `intakeOutboundFounder()` function
5. Return all discovered founders with their scan metadata

**API details:**
- GitHub REST API: `GET https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page=20`
- Rate limits: 10 req/min unauthenticated, 30 req/min with token
- Our scan makes ~5-7 requests (one per sector) — under the unauthenticated limit
- Support optional `GITHUB_TOKEN` env var for higher limits

### `lib/sourcing/devpost.ts` — DevPost Scanner

**Function:** `scanDevPost(thesis: Thesis): Promise<DiscoveredFounder[]>`

**Algorithm:**
1. Fetch recent hackathon listings from `https://devpost.com/hackathons`
   - Parse HTML with `cheerio` (install: `npm install cheerio @types/cheerio`)
   - Extract hackathon URLs and titles
2. For each recent hackathon (up to 5):
   - Fetch the project gallery: `https://{hackathon-subdomain}.devpost.com/software`
   - Parse project entries: project name, description, team members, tech stack, GitHub links
3. For each team member:
   - Build a `rawContent` string with project name, description, role, tech stack
   - Map to `/api/scan` input shape with `source: DEVPOST`
   - If a GitHub profile is listed, also cross-reference as a `GITHUB` identity
4. POST each to the shared `intakeOutboundFounder()` function
5. Return all discovered founders

**HTML parsing selectors (DevPost):**
- Hackathon list: `a.hackathon-listing` -> `href` attribute
- Project entries: `.software-entry` -> project name, description, team members
- Team members: `.team-member` -> name, DevPost username
- Tech stack tags: `.tech-tag` -> technology names

**Rate limiting:** 500ms delay between fetches. DevPost has no documented rate limit.

### `lib/sourcing/intake.ts` — Shared Outbound Intake

**Function:** `intakeOutboundFounder(data: OutboundIntakeData): Promise<{ founderId, opportunityId, knownFounder, claimsExtracted }>`

Extracted from `app/api/scan/route.ts` logic. Contains:
- Entity resolution via Identity (source+handle deduplication)
- Founder creation (or reuse if existing)
- Company creation (with fallback "pre-company" name)
- Opportunity creation (track: OUTBOUND)
- Signal creation
- Claim extraction via LLM

The existing `/api/scan` route is refactored to call this shared function.

### `lib/sourcing/rank.ts` — Candidate Ranking

**Function:** `rankFounders(founders: FounderWithScore[]): RankedFounder[]`

**Scoring algorithm (0-100 composite):**

| Component | Weight | Source |
|-----------|--------|--------|
| Thesis sector match | 30% | Founder's company sector vs thesis sectors |
| Thesis geography match | 15% | Founder's location vs thesis geographies |
| Technical signal strength | 25% | GitHub stars, forks, commit frequency (from Signal meta) |
| Recency | 15% | Days since last signal (exponential decay, 30-day half-life) |
| Visibility gap (hidden gem bonus) | 15% | Higher gap = higher bonus (caps at 100) |

**Output:** Array sorted by composite score descending, each with:
- `rankScore`: computed composite
- `reason`: LLM-generated one-liner explaining why this founder is interesting

The `reason` uses the `extract` model tier via `runLLM`. Prompt includes the founder's top 3 most compelling claims, the thesis config, and a template: "Write a one-sentence summary of why this founder is worth reaching out to. Be specific about signals (repo stars, commit activity, sector match). Under 30 words."

### `lib/sourcing/outreach.ts` — Outreach Message Generation

**Function:** `generateOutreachDraft(founder: RankedFounder, thesis: Thesis): Promise<string>`

Uses `runLLM` with the `extract` model tier. The prompt includes:
- The founder's key signals (top 3 most compelling claims)
- The thesis configuration
- Template instruction: "Write a 2-3 sentence cold outreach message from a VC fund to this founder. Be specific about what caught our attention. Mention the fund name (Argus). Keep it under 100 words. Do not be generic."

The generated message is stored in `Outreach.draftMessage` and displayed in the UI for the investor to review/edit before marking as sent.

### `lib/intel/prompts.ts` — New prompt (append)

```typescript
export const OUTREACH_SYSTEM = `You are an investment analyst drafting a brief outreach message...
(templates for reason generation and outreach draft)`;
```

## API Routes

### `POST /api/sourcing/scan` — Trigger Scan

**File:** `app/api/sourcing/scan/route.ts`

**Behavior:**
1. Fetch the active thesis
2. Run `scanGitHub(thesis)` and `scanDevPost(thesis)` in parallel via `Promise.allSettled()`
3. After both complete, query all OUTBOUND opportunities with their founder scores
4. Run `rankFounders()` on the results
5. For the top 10 (most promising), auto-generate outreach drafts via `generateOutreachDraft()` and create `Outreach` records
6. Return the full list of ranked founders

**Response:**
```json
{
  "scanId": "scan_abc123",
  "newFounders": 8,
  "totalOutbound": 24,
  "topRanked": [
    {
      "founderId": "...",
      "name": "...",
      "company": "...",
      "rankScore": 82,
      "reason": "...",
      "outreachStatus": "IDENTIFIED",
      "opportunityId": "..."
    }
  ],
  "scanDuration": 12500
}
```

`maxDuration = 120`

### `GET /api/sourcing` — Get Sourcing State

**File:** `app/api/sourcing/route.ts`

**Behavior:**
1. Query all OUTBOUND opportunities (track: OUTBOUND) with Company, Founders (with FounderScore), Outreach record (if exists), Signals (with Claims)
2. Rank them using `rankFounders()`
3. Return the full ranked list

**Response:**
```json
{
  "founders": [
    {
      "founderId": "...",
      "name": "...",
      "company": "...",
      "score": { "composite": ..., "visibilityIndex": ..., "..." },
      "rankScore": 82,
      "reason": "...",
      "outreach": {
        "id": "...",
        "status": "IDENTIFIED",
        "draftMessage": null
      },
      "opportunityId": "...",
      "source": "GITHUB",
      "daysInPipeline": 3
    }
  ],
  "lastScan": "2026-07-19T14:30:00Z",
  "stats": {
    "total": 24,
    "identified": 20,
    "drafted": 2,
    "sent": 1,
    "converted": 1
  }
}
```

### `POST /api/sourcing/[opportunityId]/activate` — Generate Outreach Draft

**File:** `app/api/sourcing/[opportunityId]/activate/route.ts`

**Behavior:**
1. Fetch the opportunity, founder, and signals
2. Generate an outreach draft via `generateOutreachDraft()`
3. Create or update the `Outreach` record with status `DRAFTED` and the draft message
4. Return the draft message

**Response:**
```json
{
  "outreachId": "...",
  "status": "DRAFTED",
  "draftMessage": "Hi Amara, I'm from Argus — an AI-powered VC fund that looks for exceptional builders before the world catches on. Your WarehouseCV project caught our attention..."
}
```

### `PATCH /api/sourcing/[opportunityId]/status` — Update Outreach Status

**File:** `app/api/sourcing/[opportunityId]/status/route.ts`

**Request body:** `{ status: OutreachStatus, notes?: string, draftMessage?: string }`

**Behavior:**
1. Find the Outreach record for this opportunity
2. Update status and optional fields
3. Set timestamp fields based on status transitions:
   - SENT -> set `sentAt`
   - REPLIED -> set `repliedAt`
   - CONVERTED -> set `convertedAt`
4. Return updated outreach

## UI

### New page: `app/sourcing/page.tsx`

**Route:** `/sourcing`

**Layout:**
```
+------------------------------------------------------+
| Sourcing                    [Last scan: 2m ago]       |
+------------------------------------------------------+
| [Total] [Identified] [Drafted] [Sent] [Converted]    |  <- stat cards row
+------------------------------------------------------+
| Sourced Founders                     [Rescan]         |
|                                                      |
| +---- Card ----------------------------------------+ |
| | Amara Diallo          warehousecv   GITHUB        | |
| | Solo founder . Berlin                            | |
| | Score: 78  Visibility: 18  Gap: +60 (gem)        | |
| |                                                   | |
| | "WarehouseCV: 234-star repo for warehouse ops     | |
| |  automation. Active last week."                   | |
| |                                                   | |
| | [Activate] [View Profile]                         | |
| +--------------------------------------------------+ |
|                                                      |
| +---- Card ----------------------------------------+ |
| | ...                                               | |
| +--------------------------------------------------+ |
+------------------------------------------------------+
```

**Behavior on page load:**
1. `GET /api/sourcing` — loads existing sourced founders (instant, no blocking)
2. Immediately fire `POST /api/sourcing/scan` in background
3. Show a subtle loading indicator ("Scanning GitHub & DevPost...")
4. When scan completes, refresh the list

**Activation flow:**
1. User clicks "Activate" on a founder card
2. `POST /api/sourcing/{opportunityId}/activate` — generates draft
3. A dialog opens showing the draft message in an editable textarea
4. User reviews/edits the message
5. User clicks "Mark as sent" -> `PATCH /api/sourcing/{opportunityId}/status` with status: SENT
6. The card updates to show "Outreach sent" with a timestamp

**Status badges on cards:**
- IDENTIFIED -> neutral tag "New"
- DRAFTED -> accent tag "Draft ready"
- SENT -> accent-2 tag "Outreach sent"
- CONVERTED -> accent tag "Converted"
- DECLINED -> neutral tag "Declined"

### Sidebar update: `app/components/Sidebar.tsx`

Add a "Sourcing" nav link between Dashboard and Pipeline. Use a radar/search icon (18x18 inline SVG, consistent with existing icon style).

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| Modify | `prisma/schema.prisma` | Add OutreachStatus enum, Outreach model, Opportunity.outreach relation |
| Create | `lib/sourcing/keywords.ts` | Sector-to-GitHub-keyword mapping |
| Create | `lib/sourcing/github.ts` | GitHub repository scanner |
| Create | `lib/sourcing/devpost.ts` | DevPost hackathon/project scanner |
| Create | `lib/sourcing/intake.ts` | Extracted outbound intake logic (from /api/scan) |
| Create | `lib/sourcing/rank.ts` | Candidate ranking algorithm |
| Create | `lib/sourcing/outreach.ts` | LLM outreach message generation |
| Modify | `app/api/scan/route.ts` | Refactor to use lib/sourcing/intake.ts |
| Create | `app/api/sourcing/route.ts` | GET sourcing state |
| Create | `app/api/sourcing/scan/route.ts` | POST trigger scan |
| Create | `app/api/sourcing/[opportunityId]/activate/route.ts` | POST generate outreach draft |
| Create | `app/api/sourcing/[opportunityId]/status/route.ts` | PATCH update outreach status |
| Create | `app/sourcing/page.tsx` | Sourcing page UI |
| Modify | `app/components/Sidebar.tsx` | Add Sourcing nav link |
| Modify | `lib/intel/prompts.ts` | Add OUTREACH_SYSTEM prompt |
| Modify | `package.json` | Add cheerio dependency |

**Total: 8 new files, 5 modified files**

## Implementation Order

1. Schema + migration (`prisma/schema.prisma` + `npx prisma db push`)
2. Shared intake (`lib/sourcing/intake.ts` — extract from /api/scan)
3. Refactor `/api/scan` to use shared intake function
4. Keywords (`lib/sourcing/keywords.ts`)
5. GitHub scanner (`lib/sourcing/github.ts`)
6. DevPost scanner (`lib/sourcing/devpost.ts`)
7. Ranking (`lib/sourcing/rank.ts`)
8. Outreach prompt (append to `lib/intel/prompts.ts`)
9. Outreach module (`lib/sourcing/outreach.ts`)
10. API routes (all 4 new routes)
11. Sidebar (add nav link)
12. Sourcing page (`app/sourcing/page.tsx`)
13. Build + lint + verify

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| GitHub rate limit (10 req/min unauthenticated) | Keep scan requests under 7 per run. Support GITHUB_TOKEN env var. |
| DevPost HTML structure changes | Use resilient selectors. If parsing fails, return empty results gracefully. |
| DevPost has no official API | Scrape HTML with cheerio. Standard approach (multiple open-source scrapers do this). |
| Scanning on every page load could be slow | Fire scan in background. Show cached results instantly. Scan updates the list asynchronously. |
| Large number of discovered founders creates noise | Rank by thesis fit. Only surface top 20. Use stat cards to give aggregate view. |
| Outreach messages feel generic | Use specific signals (repo name, star count, recent commit) in the prompt. Investor can edit before sending. |

## Why This Fits the Brief

From the hackathon challenge document:

> **MVP #5 — Outbound: Founder Identification & Activation**
> - **Identify:** continuously scan GitHub, launches, hackathons, papers/patents, and accelerator cohorts — scored the same way as an inbound application.
> - **Activate:** reach out to the strongest matches directly. Cold outreach, not cold investment — the goal is to trigger a real application.
> - **Converge:** activated applications flow into the same Screening step as inbound, so both tracks feed one funnel.

This track delivers all three sub-steps:
1. **Identify**: GitHub + DevPost scanners discover founders, create them via the same `/api/scan` endpoint (same funnel as inbound)
2. **Activate**: LLM-generated personalized outreach drafts, investor review/edit workflow
3. **Converge**: Discovered founders get Opportunity records with `track: OUTBOUND` that appear in the same pipeline as inbound applicants
