---
tags: [changelog, track-b]
commit: pending
branch: track-b-intel
date: 2026-07-19
---

# Streaming Memo + Outbound Scan

> [!info] Commit
> `feat: streaming memo endpoint (AI SDK streamObject) + outbound scan intake with entity resolution` · branch `track-b-intel`, merged to `main` (Vercel prod deploys both). Vercel is now live (user connected it).

## What was done

- **`POST /api/opportunities/[id]/memo`** — real token-by-token streaming via AI SDK `streamObject`: partial JSON conforming to the new `memoStreamSchema` streams to the client as sections fill in; on finish the memo converts to `MemoDocument` (bear case + signal→decision timer injected server-side) and persists identically to the batch path, with a manual `memo_stream` ReasoningLog row (the one sanctioned exception to the runLLM-only rule — streaming can't go through the wrapper).
  - Adversarial pass still runs first through `runLLM` (logged + cached).
  - `memoPrompt` refactored into shared `memoContext` so batch and streaming stay in lockstep.
  - Verified live: 8.1KB streamed, 1,931 output tokens, 12.5s, persisted + logged. ⚠️ Client disconnect mid-stream aborts generation and skips persistence — fine for the UI, caught during testing with a truncating curl.
- **`POST /api/scan`** — outbound intake: discovered founders (Track A fetchers will POST here) enter the SAME funnel as applicants (brief convergence requirement). Entity resolution via `Identity(source, handle)` before creating; second scan of the same handle returned `knownFounder: true` with the founder reused. 10 claims extracted from the test Devpost profile.
- `memoStreamSchema` added to contracts (strict-JSON-schema-safe variant: optionalSections as array, computed fields excluded).

## Still needed

Track C screens consume the stream · corpus import (Track A Gate 4) · outbound pipeline auto-run policy (currently scan → manual `/run`) · see [[todo]].

Prev: [[2026-07-19-db-live]]
