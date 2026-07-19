// Ranking algorithm for discovered founders. Scores each candidate on thesis
// fit, CAPABILITY (never popularity), recency, and hidden-gem potential.
//
// Ordering contract (lead directive):
//   1. real work + real traction  -> highest (traction claims raise the
//      composite via Execution/Momentum, which dominates rank at 0-30 pts)
//   2. real work, no traction yet -> high, slightly under (same capability,
//      plus up to 10 hidden-gem pts if invisible)
//   3. hype without work          -> low (thin evidence = low composite;
//      stars/followers never add rank)
// Stars are neither a reward nor an exclusion anywhere in sourcing; the
// early-stage gate lives in discovery (repo age) and the memo decision.

import type { OutreachStatus } from "@prisma/client";

export interface FounderWithScore {
  founderId: string;
  name: string;
  company: string;
  score: {
    composite: { value: number; low: number; high: number } | null;
    visibilityIndex: number | null;
    capabilityVisibilityGap: number | null;
  } | null;
  source: string;
  signals: Array<{
    source: string;
    meta: Record<string, unknown> | null;
    occurredAt: Date | null;
  }>;
  outreach: { status: OutreachStatus } | null;
  opportunityId: string;
  daysInPipeline: number;
  sector: string | null;
  location: string | null;
}

export interface RankedFounder extends FounderWithScore {
  rankScore: number;
  reason: string;
}

function thesisSectorMatch(companySector: string | null, thesisSectors: string[]): number {
  if (!companySector) return 0;
  const lower = companySector.toLowerCase();
  for (const ts of thesisSectors) {
    if (lower.includes(ts.toLowerCase()) || ts.toLowerCase().includes(lower)) return 30;
  }
  return 0;
}

function thesisGeoMatch(
  location: string | null | undefined,
  thesisGeos: string[],
): number {
  if (!location) return 0;
  const lower = location.toLowerCase();
  for (const geo of thesisGeos) {
    if (lower.includes(geo.toLowerCase()) || geo.toLowerCase().includes(lower)) return 15;
  }
  return 0;
}

/** Capability points: the Founder Score composite when scored; for not-yet-
 * scored discoveries, a small completion-evidence fallback (finished projects,
 * steady cadence — quality markers, NOT popularity counts). */
function capabilityStrength(
  score: FounderWithScore["score"],
  signals: FounderWithScore["signals"],
): number {
  if (score?.composite) {
    // 0-30 points, linear in the composite capability estimate.
    return Math.min(30, score.composite.value * 0.3);
  }
  let fallback = 0;
  for (const sig of signals) {
    const meta = sig.meta as Record<string, unknown> | null;
    if (!meta) continue;
    const finished = typeof meta.finishedProjects === "number" ? meta.finishedProjects : 0;
    fallback += Math.min(6, finished * 2);
    if (meta.commitCadence === "steady") fallback += 3;
  }
  // Unscored candidates cap at 12 — running the pipeline is what earns rank.
  return Math.min(12, fallback);
}

function recencyScore(daysInPipeline: number): number {
  // Exponential decay with 30-day half-life.
  return 15 * Math.exp(-daysInPipeline / 30);
}

function hiddenGemBonus(
  gap: number | null | undefined,
): number {
  if (gap == null) return 0;
  // Capped at 10 so equal-capability ordering favors demonstrated traction
  // (in the composite) over invisibility.
  return Math.min(10, Math.max(0, gap / 4));
}

/**
 * Rank a list of discovered founders by composite score.
 * Returns a new array sorted by rankScore descending.
 */
export function rankFounders(
  founders: FounderWithScore[],
  thesisSectors: string[],
  thesisGeos: string[],
): RankedFounder[] {
  const scored = founders.map((f) => {
    const sectorPts = thesisSectorMatch(f.sector, thesisSectors);
    const geoPts = thesisGeoMatch(f.location, thesisGeos);
    const capabilityPts = capabilityStrength(f.score, f.signals);
    const recencyPts = recencyScore(f.daysInPipeline);
    const gemPts = hiddenGemBonus(f.score?.capabilityVisibilityGap);

    const rankScore = Math.round(sectorPts + geoPts + capabilityPts + recencyPts + gemPts);

    return {
      ...f,
      rankScore,
      reason: "", // Populated later by LLM
    };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore);
  return scored;
}

/**
 * Build a compact signal summary string for the LLM reason/outreach prompts.
 */
export function signalSummary(founder: FounderWithScore): string {
  const parts: string[] = [];

  if (founder.score) {
    parts.push(`Composite score: ${founder.score.composite?.value ?? "N/A"}`);
    parts.push(`Visibility: ${founder.score.visibilityIndex ?? "N/A"}`);
    const gap = founder.score.capabilityVisibilityGap;
    if (gap != null && gap > 30) parts.push(`Hidden gem (gap: +${gap})`);
  }

  for (const sig of founder.signals.slice(0, 3)) {
    const meta = sig.meta as Record<string, unknown> | null;
    if (meta) {
      if (typeof meta.stars === "number" && meta.stars > 0) {
        parts.push(`GitHub repo: ${meta.stars} stars`);
      }
      if (typeof meta.language === "string") parts.push(`Language: ${meta.language}`);
      if (typeof meta.project === "string") parts.push(`DevPost project: ${meta.project}`);
      if (typeof meta.hackathon === "string") parts.push(`Hackathon: ${meta.hackathon}`);
    }
    if (sig.occurredAt) {
      const daysAgo = Math.floor((Date.now() - new Date(sig.occurredAt).getTime()) / 86_400_000);
      parts.push(`Last signal: ${daysAgo}d ago`);
    }
  }

  return parts.join("\n");
}
