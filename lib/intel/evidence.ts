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
    lines.push(`  ${s.rawContent.replaceAll("\n", " ").slice(0, 1200)}`);
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
 */
export function computeCoverage(bundle: EvidenceBundle): number {
  const signalCount = Math.min(bundle.signals.length / 5, 1);
  const distinctSources = new Set(bundle.signals.map((s) => s.source)).size;
  const diversity = Math.min(distinctSources / 4, 1);
  const verified = bundle.claims.filter((c) => c.verificationStatus === "VERIFIED").length;
  const verifiedShare = bundle.claims.length > 0 ? verified / bundle.claims.length : 0;
  const coverage = 0.45 * signalCount + 0.3 * diversity + 0.25 * verifiedShare;
  return Math.round(coverage * 100) / 100;
}
