import { z } from "zod";

// =============================================================================
// Shared zod contracts between all pipeline stages.
// FREEZE RULE: changes to this file must be announced to the whole team BEFORE
// merging — every track depends on these shapes.
// =============================================================================

// ---- Score bands ------------------------------------------------------------

/** Every score is a band, not a number. "Execution: 68 [55-81]". */
export const scoreBandSchema = z.object({
  value: z.number().min(0).max(100),
  low: z.number().min(0).max(100),
  high: z.number().min(0).max(100),
  /** Evidence coverage 0-1: signal count, source diversity, verified share. */
  coverage: z.number().min(0).max(1).optional(),
});
export type ScoreBand = z.infer<typeof scoreBandSchema>;

export const DIMENSION_KEYS = [
  "execution",
  "technicalDepth",
  "problemInsight",
  "resourcefulness",
  "momentum",
] as const;
export const dimensionKeySchema = z.enum(DIMENSION_KEYS);
export type DimensionKey = z.infer<typeof dimensionKeySchema>;

export const founderScoreSnapshotSchema = z.object({
  execution: scoreBandSchema,
  technicalDepth: scoreBandSchema,
  problemInsight: scoreBandSchema,
  resourcefulness: scoreBandSchema,
  momentum: scoreBandSchema,
  composite: scoreBandSchema,
  visibilityIndex: z.number().min(0).max(100),
  capabilityVisibilityGap: z.number().min(-100).max(100),
});
export type FounderScoreSnapshot = z.infer<typeof founderScoreSnapshotSchema>;

// ---- Founder context (Resourcefulness denominator) --------------------------

export const founderContextSchema = z.object({
  teamStatus: z.enum(["solo", "cofounders", "unknown"]).default("unknown"),
  occupation: z
    .enum(["student", "employed", "full_time_founder", "researcher", "unknown"])
    .default("unknown"),
  /** Free text: "none known", "$150K angel 2024", ... */
  priorFunding: z.string().default("none known"),
  location: z.string().optional(),
  notes: z.string().optional(),
});
export type FounderContext = z.infer<typeof founderContextSchema>;

// ---- Stage 1: claim extraction ----------------------------------------------

export const claimCategorySchema = z.enum([
  "traction",
  "team",
  "market",
  "revenue",
  "product",
  "technology",
  "other",
]);
export type ClaimCategory = z.infer<typeof claimCategorySchema>;

export const extractedClaimSchema = z.object({
  text: z.string(),
  category: claimCategorySchema,
  /** e.g. "slide 7", "README", "HN comment" */
  sourceLocation: z.string().nullish(),
  specificity: z.string().transform((val) => {
    const lower = val.toLowerCase().trim();
    if (lower.includes("high")) return "high" as const;
    if (lower.includes("low")) return "low" as const;
    return "medium" as const;
  }),
});
export type ExtractedClaim = z.infer<typeof extractedClaimSchema>;

export const extractionOutputSchema = z.object({
  claims: z.array(extractedClaimSchema),
});
export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

// ---- Stage 3: first-pass screen ---------------------------------------------

export const screenResultSchema = z.object({
  verdict: z.enum(["proceed", "reject"]),
  reason: z.string(),
});
export type ScreenResult = z.infer<typeof screenResultSchema>;

// ---- Stage 4: dimension scoring (3x self-consistency samples) ---------------

/** One sample from one dimension scorer run. Spread across 3 samples = band. */
export const dimensionSampleSchema = z.object({
  score: z.number().min(0).max(100),
  rationale: z.string(),
  /** Claim/Signal ids (or short quotes) that drove the score. */
  citedEvidence: z.array(z.string()),
});
export type DimensionSample = z.infer<typeof dimensionSampleSchema>;

// ---- Stage 5: 3-axis opportunity scoring ------------------------------------

export const axisSchema = z.enum(["founder", "market", "idea_vs_market"]);
export type AxisKey = z.infer<typeof axisSchema>;

export const trendSchema = z.enum(["improving", "declining", "stable"]);

export const axisScoreOutputSchema = z.object({
  value: z.number().min(0).max(100),
  trend: trendSchema,
  rationale: z.string(),
  citedClaimIds: z.array(z.string()),
});
export type AxisScoreOutput = z.infer<typeof axisScoreOutputSchema>;

// ---- Stage 6: validator / trust scores --------------------------------------

export const validationResultSchema = z.object({
  trustScore: z.number().min(0).max(1),
  verificationStatus: z.enum(["verified", "unverified", "contradicted"]),
  reasoning: z.string(),
  contradictingSignalIds: z.array(z.string()).default([]),
});
export type ValidationResult = z.infer<typeof validationResultSchema>;

// ---- Stage 7: adversarial pass (structured) ---------------------------------

export const adversarialBulletSchema = z.object({
  point: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  evidenceRefs: z.array(z.string()),
});
export type AdversarialBullet = z.infer<typeof adversarialBulletSchema>;

export const adversarialOutputSchema = z.object({
  bullets: z.array(adversarialBulletSchema).min(2).max(6),
  summary: z.string(),
});
export type AdversarialOutput = z.infer<typeof adversarialOutputSchema>;

// ---- Stage 8: interview playbook --------------------------------------------

export const interviewQuestionOutputSchema = z.object({
  targetDimension: dimensionKeySchema,
  question: z.string(),
  strongAnswerSignature: z.string(),
  redFlagSignature: z.string(),
  /** e.g. "resolves Execution band from ±13 to ~±5" */
  expectedBandReduction: z.string(),
});
export type InterviewQuestionOutput = z.infer<typeof interviewQuestionOutputSchema>;

export const interviewPlaybookSchema = z.object({
  questions: z.array(interviewQuestionOutputSchema).min(3).max(6),
});
export type InterviewPlaybook = z.infer<typeof interviewPlaybookSchema>;

// ---- Ambition & Drive read (idea-agnostic, softer than the scored dims) -----

/** Deliberately less strict than the Founder Score: a qualitative read of the
 * person that survives a pivot. See docs/research/founder-predictors.md. */
export const ambitionReadSchema = z.object({
  /** transformative = wants to change an industry; modest = lifestyle/feature. */
  ambitionLevel: z.enum(["transformative", "substantial", "modest", "unclear"]),
  /** Concrete evidence of relentless resourcefulness (obstacle -> workaround). */
  resourcefulnessSignals: z.array(z.string()),
  learningVelocity: z.enum(["fast", "moderate", "slow", "unclear"]),
  /** Evidence of persistence/resilience: continued cadence after setbacks. */
  persistenceEvidence: z.array(z.string()),
  /** High = big adjectives with no falsifiable commitments (ambition-as-hype). */
  hypeRisk: z.enum(["low", "medium", "high"]),
  /** Would we still back this person if this exact idea died? */
  ideaAgnosticVerdict: z.enum(["back_the_person", "depends_on_idea", "unclear"]),
  rationale: z.string(),
  citedEvidence: z.array(z.string()),
});
export type AmbitionRead = z.infer<typeof ambitionReadSchema>;

// ---- Delta updates (tracking loop: new signal -> band moves) ----------------

export const deltaUpdateOutputSchema = z.object({
  updates: z.array(
    z.object({
      dimension: dimensionKeySchema,
      newBand: scoreBandSchema,
      rationale: z.string(),
    })
  ),
});
export type DeltaUpdateOutput = z.infer<typeof deltaUpdateOutputSchema>;

// ---- Memo -------------------------------------------------------------------

export const memoDecisionSchema = z.enum(["invest", "pass", "request_info"]);
export type MemoDecision = z.infer<typeof memoDecisionSchema>;

/** Memo stored on Opportunity.memo. Sections are markdown; claims are footnoted
 * inline as [claim:<id>] and the UI resolves trust badges from Claim rows. */
export const memoDocumentSchema = z.object({
  companySnapshot: z.string(),
  investmentHypotheses: z.string(),
  swot: z.string(),
  problemAndProduct: z.string(),
  tractionAndKpis: z.string(),
  /** Optional sections, only when evidence exists. Explicit gap-flags otherwise. */
  optionalSections: z.record(z.string(), z.string()).default({}),
  bearCase: z.string(),
  decision: memoDecisionSchema,
  decisionRationale: z.string(),
  thesisFit: z.string(),
  /** Explicitly flagged gaps, e.g. "Cap table: not disclosed". */
  gaps: z.array(z.string()).default([]),
  signalToDecisionHours: z.number().nullish(),
});
export type MemoDocument = z.infer<typeof memoDocumentSchema>;

/** Streaming variant for the memo endpoint: record/computed fields replaced by
 * stream-safe shapes (strict JSON-schema mode forbids open records). Converted
 * to MemoDocument on persist — bearCase and the timer are injected server-side. */
export const memoStreamSchema = z.object({
  companySnapshot: z.string(),
  investmentHypotheses: z.string(),
  swot: z.string(),
  problemAndProduct: z.string(),
  tractionAndKpis: z.string(),
  optionalSections: z.array(z.object({ title: z.string(), content: z.string() })),
  decision: memoDecisionSchema,
  decisionRationale: z.string(),
  thesisFit: z.string(),
  gaps: z.array(z.string()),
});
export type MemoStream = z.infer<typeof memoStreamSchema>;

// ---- NL query bar -----------------------------------------------------------

export const nlQueryFilterSchema = z.object({
  sectors: z.array(z.string()).default([]),
  geographies: z.array(z.string()).default([]),
  stages: z.array(z.string()).default([]),
  requiresTechnicalFounder: z.boolean().nullish(),
  noPriorVcBacking: z.boolean().nullish(),
  hiddenGemsOnly: z.boolean().nullish(),
  keywords: z.array(z.string()).default([]),
});
export type NlQueryFilter = z.infer<typeof nlQueryFilterSchema>;

// ---- Thesis -----------------------------------------------------------------

export const thesisConfigSchema = z.object({
  name: z.string(),
  sectors: z.array(z.string()),
  stages: z.array(z.string()),
  geographies: z.array(z.string()),
  checkSizeUsd: z.number().int().positive(),
  ownershipTargetPct: z.number().min(0).max(100).nullish(),
  riskAppetite: z.enum(["conservative", "balanced", "aggressive"]),
});
export type ThesisConfig = z.infer<typeof thesisConfigSchema>;
