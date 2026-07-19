// Ranking algorithm for discovered founders. Scores each candidate on thesis
// fit, technical signals, recency, and hidden-gem potential.

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

function technicalSignalStrength(
  signals: FounderWithScore["signals"],
): number {
  let score = 0;
  for (const sig of signals) {
    const meta = sig.meta as Record<string, unknown> | null;
    if (!meta) continue;

    const stars = typeof meta.stars === "number" ? meta.stars : 0;
    const forks = typeof meta.forks === "number" ? meta.forks : 0;
    const followers = typeof meta.followers === "number" ? meta.followers : 0;

    // Stars: 0-10 points (saturates at 500).
    score += Math.min(10, (stars / 500) * 10);
    // Forks: 0-5 points (saturates at 100).
    score += Math.min(5, (forks / 100) * 5);
    // Followers: 0-10 points (saturates at 1000).
    score += Math.min(10, (followers / 1000) * 10);
  }
  return Math.min(25, score);
}

function recencyScore(daysInPipeline: number): number {
  // Exponential decay with 30-day half-life.
  return 15 * Math.exp(-daysInPipeline / 30);
}

function hiddenGemBonus(
  gap: number | null | undefined,
): number {
  if (gap == null) return 0;
  return Math.min(15, Math.max(0, gap / 4));
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
    const sectorPts = thesisSectorMatch(null, thesisSectors); // Company.sector not available here
    const geoPts = thesisGeoMatch(null, thesisGeos); // Location from context not available here
    const techPts = technicalSignalStrength(f.signals);
    const recencyPts = recencyScore(f.daysInPipeline);
    const gemPts = hiddenGemBonus(f.score?.capabilityVisibilityGap);

    const rankScore = Math.round(sectorPts + geoPts + techPts + recencyPts + gemPts);

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
