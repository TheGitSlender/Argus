import { Dimension, type FounderScore, type Thesis } from "@prisma/client";
import { prisma } from "./db";
import {
  founderContextSchema,
  scoreBandSchema,
  DIMENSION_KEYS,
  type AmbitionRead,
  type DeltaUpdateOutput,
  type DimensionKey,
  type FounderScoreSnapshot,
  type InterviewPlaybook,
  type MemoDocument,
  type ScoreBand,
  type ThesisConfig,
  type ValidationResult,
} from "./contracts";
import type { EvidenceBundle } from "./intel/evidence";
import type { FounderScoreResult } from "./intel/founder-score";
import type { AxisSet } from "./intel/memo";
import { compositeBand, medianIndex } from "./intel/band-math";

// =============================================================================
// Persistence: the only place where intelligence results touch Prisma.
// ScoreHistory/ReasoningLog stay append-only; Claims are updated in place
// (trust fields only); FounderScore is the mutable snapshot.
// =============================================================================

const DIM_TO_ENUM: Record<DimensionKey, Dimension> = {
  execution: Dimension.EXECUTION,
  technicalDepth: Dimension.TECHNICAL_DEPTH,
  problemInsight: Dimension.PROBLEM_INSIGHT,
  resourcefulness: Dimension.RESOURCEFULNESS,
  momentum: Dimension.MOMENTUM,
};

/** Assemble the EvidenceBundle for a founder from everything Memory holds. */
export async function assembleBundle(founderId: string): Promise<EvidenceBundle> {
  const founder = await prisma.founder.findUniqueOrThrow({
    where: { id: founderId },
    include: { signals: { include: { claims: true }, orderBy: { ingestedAt: "asc" } } },
  });
  return {
    founder: {
      id: founder.id,
      name: founder.name,
      context: founderContextSchema.parse(founder.context ?? {}),
    },
    signals: founder.signals.map((s) => ({
      id: s.id,
      source: s.source,
      sourceUrl: s.sourceUrl,
      rawContent: s.rawContent,
      occurredAt: s.occurredAt,
      meta: (s.meta ?? null) as Record<string, unknown> | null,
    })),
    claims: founder.signals.flatMap((s) =>
      s.claims.map((c) => ({
        id: c.id,
        signalId: c.signalId,
        text: c.text,
        category: c.category.toLowerCase(),
        sourceLocation: c.sourceLocation,
        specificity: c.specificity,
        trustScore: c.trustScore,
        verificationStatus: c.verificationStatus,
      }))
    ),
  };
}

export function snapshotFromDb(row: FounderScore): FounderScoreSnapshot {
  return {
    execution: scoreBandSchema.parse(row.execution),
    technicalDepth: scoreBandSchema.parse(row.technicalDepth),
    problemInsight: scoreBandSchema.parse(row.problemInsight),
    resourcefulness: scoreBandSchema.parse(row.resourcefulness),
    momentum: scoreBandSchema.parse(row.momentum),
    composite: scoreBandSchema.parse(row.composite),
    visibilityIndex: row.visibilityIndex,
    capabilityVisibilityGap: row.capabilityVisibilityGap,
  };
}

export function thesisConfigFromDb(row: Thesis): ThesisConfig {
  const riskAppetites = ["conservative", "balanced", "aggressive"] as const;
  const valid = riskAppetites.includes(row.riskAppetite as typeof riskAppetites[number]);
  return {
    name: row.name,
    sectors: row.sectors,
    stages: row.stages,
    geographies: row.geographies,
    checkSizeUsd: row.checkSizeUsd,
    ownershipTargetPct: row.ownershipTargetPct,
    riskAppetite: valid ? (row.riskAppetite as ThesisConfig["riskAppetite"]) : "balanced",
  };
}

/** Upsert the snapshot and append one ScoreHistory row per changed dimension. */
export async function saveFounderScore(
  founderId: string,
  result: FounderScoreResult,
  ambition: AmbitionRead | null,
  causeSignalId?: string | null
): Promise<void> {
  const prev = await prisma.founderScore.findUnique({ where: { founderId } });
  const s = result.snapshot;
  const fields = {
    execution: s.execution,
    technicalDepth: s.technicalDepth,
    problemInsight: s.problemInsight,
    resourcefulness: s.resourcefulness,
    momentum: s.momentum,
    composite: s.composite,
    visibilityIndex: s.visibilityIndex,
    capabilityVisibilityGap: s.capabilityVisibilityGap,
    ...(ambition ? { ambitionRead: ambition } : {}),
  };
  await prisma.founderScore.upsert({
    where: { founderId },
    create: { founderId, ...fields },
    update: fields,
  });
  await prisma.scoreHistory.createMany({
    data: DIMENSION_KEYS.map((dim) => {
      const band = s[dim];
      const idx = medianIndex(band);
      const position = idx < 0.4 ? "lower end" : idx > 0.6 ? "upper end" : "centred";
      const base = result.dimensions[dim].samples[0]?.rationale ?? "scored from full evidence bundle";
      return {
        founderId,
        dimension: DIM_TO_ENUM[dim],
        oldBand: prev ? (prev[dim] as object) : undefined,
        newBand: band,
        causeSignalId: causeSignalId ?? null,
        rationale: `${base} [band position: ${position} (${idx.toFixed(2)})]`,
      };
    }),
  });
}

/** Delta updates: adjust only named dimensions, recompute composite, append history. */
export async function applyDeltaUpdates(
  founderId: string,
  delta: DeltaUpdateOutput,
  causeSignalId: string
): Promise<FounderScoreSnapshot> {
  const row = await prisma.founderScore.findUniqueOrThrow({ where: { founderId } });
  const snapshot = snapshotFromDb(row);

  const updated: Record<DimensionKey, ScoreBand> = {
    execution: snapshot.execution,
    technicalDepth: snapshot.technicalDepth,
    problemInsight: snapshot.problemInsight,
    resourcefulness: snapshot.resourcefulness,
    momentum: snapshot.momentum,
  };
  for (const u of delta.updates) {
    updated[u.dimension] = { ...u.newBand, coverage: updated[u.dimension].coverage };
  }
  const composite = compositeBand(DIMENSION_KEYS.map((d) => updated[d]));
  const gap = Math.round((composite.value - snapshot.visibilityIndex) * 10) / 10;

  await prisma.founderScore.update({
    where: { founderId },
    data: { ...updated, composite, capabilityVisibilityGap: gap },
  });
  await prisma.scoreHistory.createMany({
    data: delta.updates.map((u) => ({
      founderId,
      dimension: DIM_TO_ENUM[u.dimension],
      oldBand: snapshot[u.dimension],
      newBand: updated[u.dimension],
      causeSignalId,
      rationale: u.rationale,
    })),
  });

  return { ...updated, composite, visibilityIndex: snapshot.visibilityIndex, capabilityVisibilityGap: gap };
}

export async function saveAxisScores(opportunityId: string, axes: AxisSet): Promise<void> {
  await prisma.axisScore.createMany({
    data: (Object.entries(axes) as Array<[keyof AxisSet, AxisSet[keyof AxisSet]]>).map(([axis, a]) => ({
      opportunityId,
      axis: axis === "founder" ? "FOUNDER" : axis === "market" ? "MARKET" : "IDEA_VS_MARKET",
      value: a.value,
      trend: a.trend.toUpperCase() as "IMPROVING" | "DECLINING" | "STABLE",
      rationale: a.rationale,
      citedClaimIds: a.citedClaimIds,
    })),
  });
}

/** Write validator results onto the claims (trust fields only). */
export async function applyValidations(
  validations: Array<{ claimId: string; result: ValidationResult }>
): Promise<void> {
  await Promise.all(
    validations.map((v) =>
      prisma.claim.update({
        where: { id: v.claimId },
        data: {
          trustScore: v.result.trustScore,
          verificationStatus: v.result.verificationStatus.toUpperCase() as "VERIFIED" | "UNVERIFIED" | "CONTRADICTED",
          evidenceRefs: {
            reasoning: v.result.reasoning,
            contradictingSignalIds: v.result.contradictingSignalIds,
          },
        },
      })
    )
  );
}

export async function savePlaybook(
  founderId: string,
  opportunityId: string | null,
  playbook: InterviewPlaybook
): Promise<void> {
  await prisma.interviewQuestion.createMany({
    data: playbook.questions.map((q) => ({
      founderId,
      opportunityId,
      targetDimension: DIM_TO_ENUM[q.targetDimension],
      question: q.question,
      strongAnswerSignature: q.strongAnswerSignature,
      redFlagSignature: q.redFlagSignature,
      expectedBandReduction: q.expectedBandReduction,
    })),
  });
}

/** Everything the memo stage needs, loaded from Memory for one opportunity. */
export async function loadMemoInputs(opportunityId: string) {
  const opportunity = await prisma.opportunity.findUniqueOrThrow({
    where: { id: opportunityId },
    include: {
      company: true,
      founders: true,
      axisScores: { orderBy: { createdAt: "desc" } },
    },
  });
  const founderId = opportunity.founders[0]?.founderId;
  if (!founderId) throw new Error("Opportunity has no linked founder");

  const [bundle, scoreRow, questions, thesisRow] = await Promise.all([
    assembleBundle(founderId),
    prisma.founderScore.findUnique({ where: { founderId } }),
    prisma.interviewQuestion.findMany({
      where: { founderId, opportunityId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.thesis.findFirst({ where: { active: true } }),
  ]);
  if (!scoreRow) throw new Error("Founder has no score yet — run the pipeline first.");

  const latestByAxis = new Map<string, (typeof opportunity.axisScores)[number]>();
  for (const a of opportunity.axisScores) if (!latestByAxis.has(a.axis)) latestByAxis.set(a.axis, a);

  return {
    opportunity,
    founderId,
    bundle,
    snapshot: snapshotFromDb(scoreRow),
    axisRows: latestByAxis,
    playbookSummary: questions
      .map((q) => `- [${q.targetDimension.toLowerCase()}] ${q.question} (${q.expectedBandReduction ?? ""})`)
      .join("\n"),
    thesis: thesisRow ? thesisConfigFromDb(thesisRow) : null,
  };
}

const DECISION_TO_ENUM = { invest: "INVEST", pass: "PASS", request_info: "REQUEST_INFO" } as const;

export async function saveMemo(opportunityId: string, memo: MemoDocument): Promise<void> {
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      memo: memo as object,
      decision: DECISION_TO_ENUM[memo.decision],
      status: "DECIDED",
      decidedAt: new Date(),
    },
  });
}
