import type { FounderContext } from "../contracts";

// =============================================================================
// EvidenceBundle: the plain-data input every intelligence stage consumes.
// DB-independent on purpose — callers assemble it from Prisma rows, seed data,
// or literals in tests. Stage code never touches the database directly.
// =============================================================================

export interface EvidenceSignal {
  id: string;
  source: string;
  sourceUrl?: string | null;
  rawContent: string;
  occurredAt?: Date | null;
  meta?: Record<string, unknown> | null;
}

export interface EvidenceClaim {
  id: string;
  signalId?: string;
  text: string;
  category: string;
  sourceLocation?: string | null;
  specificity?: string | null;
  trustScore?: number | null;
  verificationStatus?: string;
}

export interface EvidenceBundle {
  founder: {
    id?: string;
    name: string;
    context: FounderContext;
  };
  signals: EvidenceSignal[];
  claims: EvidenceClaim[];
}

/** Render a bundle as prompt text. Ids are inlined so model output can cite them. */
export function renderEvidence(bundle: EvidenceBundle): string {
  const { founder, signals, claims } = bundle;
  const ctx = founder.context;
  const lines: string[] = [
    `FOUNDER: ${founder.name}`,
    `CONTEXT (resources available — the Resourcefulness denominator):`,
    `- team: ${ctx.teamStatus} | occupation: ${ctx.occupation} | prior funding: ${ctx.priorFunding}`,
    ...(ctx.location ? [`- location: ${ctx.location}`] : []),
    ...(ctx.notes ? [`- notes: ${ctx.notes}`] : []),
    ``,
    `SIGNALS (raw evidence, source-tagged):`,
  ];
  if (signals.length === 0) lines.push("- (none)");
  for (const s of signals) {
    const when = s.occurredAt ? ` | ${s.occurredAt.toISOString().slice(0, 10)}` : "";
    lines.push(`- [signal:${s.id}] source=${s.source}${when}${s.sourceUrl ? ` | ${s.sourceUrl}` : ""}`);
    const content = s.rawContent.replaceAll("\n", " ");
    const truncated = content.length > 1200;
    lines.push(`  ${truncated ? content.slice(0, 1200) + " [truncated]" : content}`);
    if (s.meta && Object.keys(s.meta).length > 0) {
      lines.push(`  meta: ${JSON.stringify(s.meta)}`);
    }
  }
  lines.push(``, `EXTRACTED CLAIMS (assertions; verification status matters):`);
  if (claims.length === 0) lines.push("- (none)");
  for (const c of claims) {
    const bits = [
      `category=${c.category}`,
      c.sourceLocation ? `at=${c.sourceLocation}` : null,
      c.specificity ? `specificity=${c.specificity}` : null,
      `status=${c.verificationStatus ?? "UNVERIFIED"}`,
      c.trustScore != null ? `trust=${c.trustScore}` : null,
    ].filter(Boolean);
    lines.push(`- [claim:${c.id}] (${bits.join(" | ")}) ${c.text}`);
  }
  return lines.join("\n");
}

/**
 * Evidence coverage 0-1: how much the evidence can support a confident score.
 * Drives band widening — few signals / single source / unverified claims widen.
 *
 * Components:
 *   0.30 · signalCount     (saturates at 5 signals)
 *   0.20 · sourceDiversity  (saturates at 4 distinct sources)
 *   0.20 · verifiedShare    (share of claims with VERIFIED status)
 *   0.15 · specificityShare (share of high-specificity claims)
 *   0.15 · recencyScore     (avg age-decay of signals, 90-day half-life)
 *
 * Minimum evidence floor: <2 signals → cap at 0.15 (wide bands mandatory).
 */
export function computeCoverage(bundle: EvidenceBundle): number {
  if (bundle.signals.length < 2) return Math.min(0.15, computeRawCoverage(bundle));
  return Math.round(computeRawCoverage(bundle) * 100) / 100;
}

function computeRawCoverage(bundle: EvidenceBundle): number {
  const signalCount = Math.min(bundle.signals.length / 5, 1);
  const distinctSources = new Set(bundle.signals.map((s) => s.source)).size;
  const diversity = Math.min(distinctSources / 4, 1);

  const verified = bundle.claims.filter((c) => c.verificationStatus === "VERIFIED").length;
  const verifiedShare = bundle.claims.length > 0 ? verified / bundle.claims.length : 0;

  const highSpec = bundle.claims.filter((c) => c.specificity === "high").length;
  const specificityShare = bundle.claims.length > 0 ? highSpec / bundle.claims.length : 0;

  const now = Date.now();
  const DAY_MS = 86_400_000;
  const recencyScores = bundle.signals.map((s) => {
    if (!s.occurredAt) return 0.33; // unknown date → neutral midpoint
    const daysAgo = Math.max(0, (now - s.occurredAt.getTime()) / DAY_MS);
    return Math.max(0, 1 - daysAgo / 90);
  });
  const recencyScore = recencyScores.length > 0
    ? recencyScores.reduce((a, b) => a + b, 0) / recencyScores.length
    : 0;

  return 0.30 * signalCount + 0.20 * diversity + 0.20 * verifiedShare + 0.15 * specificityShare + 0.15 * recencyScore;
}
