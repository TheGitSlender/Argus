import type { AmbitionRead, InterviewPlaybook, MemoDocument, ScreenResult, ThesisConfig, ValidationResult } from "../contracts";
import type { EvidenceBundle } from "./evidence";
import { renderBandSummary, scoreFounder, type FounderScoreResult } from "./founder-score";
import { generatePlaybook, readAmbition, scoreAxis, screenApplication, validateClaim } from "./stages";
import { generateMemo, type AxisSet } from "./memo";

// =============================================================================
// The full opportunity pipeline, DB-free: bundle in -> decision-ready packet
// out. Route handlers wrap this with persistence (save scores, append history,
// update claims from validations, store memo on the opportunity).
//
// Resilience: every parallel stage uses Promise.allSettled so one failure
// degrades gracefully instead of killing the whole pipeline. Errors are
// collected in PipelineResult and logged to console for route handlers to
// persist to ReasoningLog.
// =============================================================================

export interface StageError {
  stage: string;
  error: string;
}

export interface PipelineResult {
  screen: ScreenResult;
  founderScore: FounderScoreResult | null;
  ambition: AmbitionRead | null;
  axes: AxisSet | null;
  validations: Array<{ claimId: string; result: ValidationResult }>;
  playbook: InterviewPlaybook | null;
  memo: MemoDocument | null;
  errors: StageError[];
}

export interface PipelineOptions {
  thesis?: ThesisConfig | null;
  firstSignalAt?: Date | null;
  /** Validate at most this many claims (cost control). Unverified first. */
  maxClaimValidations?: number;
}

function extractError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function logStageFailure(stage: string, err: unknown) {
  console.warn(`[pipeline] stage "${stage}" failed (degrading gracefully): ${extractError(err)}`);
}

export async function runOpportunityPipeline(
  bundle: EvidenceBundle,
  opts: PipelineOptions = {}
): Promise<PipelineResult> {
  const errors: StageError[] = [];

  // Stage 3: first-pass screen — if this fails, we can't proceed at all.
  let screen: ScreenResult;
  try {
    screen = await screenApplication(bundle);
  } catch (err) {
    logStageFailure("screen", err);
    errors.push({ stage: "screen", error: extractError(err) });
    // Can't proceed without a screen verdict — return early with reject.
    return {
      screen: { verdict: "reject", reason: `Screen stage failed: ${extractError(err)}` },
      founderScore: null, ambition: null, axes: null, validations: [], playbook: null, memo: null, errors,
    };
  }

  if (screen.verdict === "reject") {
    return { screen, founderScore: null, ambition: null, axes: null, validations: [], playbook: null, memo: null, errors: [] };
  }

  // Stage 4a/4b/4c: founder score, ambition read, and claim validations are independent.
  const claimsToValidate = [...bundle.claims]
    .sort((a, b) => (a.verificationStatus === "UNVERIFIED" ? -1 : 1) - (b.verificationStatus === "UNVERIFIED" ? -1 : 1))
    .slice(0, opts.maxClaimValidations ?? 5);

  const [scoreResult, ambitionResult, validationResult] = await Promise.allSettled([
    scoreFounder(bundle),
    readAmbition(bundle),
    Promise.all(
      claimsToValidate.map(async (claim) => ({ claimId: claim.id, result: await validateClaim(claim, bundle) }))
    ),
  ]);

  const founderScore = scoreResult.status === "fulfilled" ? scoreResult.value : null;
  if (scoreResult.status === "rejected") {
    logStageFailure("founder_score", scoreResult.reason);
    errors.push({ stage: "founder_score", error: extractError(scoreResult.reason) });
  }

  const ambition = ambitionResult.status === "fulfilled" ? ambitionResult.value : null;
  if (ambitionResult.status === "rejected") {
    logStageFailure("ambition", ambitionResult.reason);
    errors.push({ stage: "ambition", error: extractError(ambitionResult.reason) });
  }

  const validations = validationResult.status === "fulfilled" ? validationResult.value : [];
  if (validationResult.status === "rejected") {
    logStageFailure("validations", validationResult.reason);
    errors.push({ stage: "validations", error: extractError(validationResult.reason) });
  }

  // Build band summary — degrade gracefully if score failed.
  const bandSummary = founderScore
    ? renderBandSummary(founderScore.snapshot)
    : "(no persistent founder score yet — first contact)";

  // Stage 5 + 6: axes and playbook — all independent, all degrade gracefully.
  const [founderAxisResult, marketAxisResult, ideaAxisResult, playbookResult] = await Promise.allSettled([
    scoreAxis("founder", bundle, { founderScoreSummary: bandSummary }),
    scoreAxis("market", bundle, { thesis: opts.thesis }),
    scoreAxis("idea_vs_market", bundle),
    generatePlaybook(bandSummary, bundle),
  ]);

  const founderAxis = founderAxisResult.status === "fulfilled" ? founderAxisResult.value : null;
  if (founderAxisResult.status === "rejected") {
    logStageFailure("axis_founder", founderAxisResult.reason);
    errors.push({ stage: "axis_founder", error: extractError(founderAxisResult.reason) });
  }

  const marketAxis = marketAxisResult.status === "fulfilled" ? marketAxisResult.value : null;
  if (marketAxisResult.status === "rejected") {
    logStageFailure("axis_market", marketAxisResult.reason);
    errors.push({ stage: "axis_market", error: extractError(marketAxisResult.reason) });
  }

  const ideaAxis = ideaAxisResult.status === "fulfilled" ? ideaAxisResult.value : null;
  if (ideaAxisResult.status === "rejected") {
    logStageFailure("axis_idea_vs_market", ideaAxisResult.reason);
    errors.push({ stage: "axis_idea_vs_market", error: extractError(ideaAxisResult.reason) });
  }

  const playbook = playbookResult.status === "fulfilled" ? playbookResult.value : null;
  if (playbookResult.status === "rejected") {
    logStageFailure("playbook", playbookResult.reason);
    errors.push({ stage: "playbook", error: extractError(playbookResult.reason) });
  }

  // Build axes — only include non-null axes.
  const axes: AxisSet | null =
    founderAxis || marketAxis || ideaAxis
      ? {
          founder: founderAxis ?? { value: 0, trend: "stable", rationale: "Axis scoring failed", citedClaimIds: [] },
          market: marketAxis ?? { value: 0, trend: "stable", rationale: "Axis scoring failed", citedClaimIds: [] },
          idea_vs_market: ideaAxis ?? { value: 0, trend: "stable", rationale: "Axis scoring failed", citedClaimIds: [] },
        }
      : null;

  // Stage 7 + 8: memo assembly — degrade gracefully.
  let memo: MemoDocument | null = null;
  try {
    const result = await generateMemo({
      bundle,
      bandSummary,
      axes: axes ?? {
        founder: { value: 0, trend: "stable", rationale: "unavailable — axis scoring failed", citedClaimIds: [] },
        market: { value: 0, trend: "stable", rationale: "unavailable — axis scoring failed", citedClaimIds: [] },
        idea_vs_market: { value: 0, trend: "stable", rationale: "unavailable — axis scoring failed", citedClaimIds: [] },
      },
      playbook: playbook ?? { questions: [] },
      ambition,
      thesis: opts.thesis,
      firstSignalAt: opts.firstSignalAt,
    });
    memo = result.memo;
  } catch (err) {
    logStageFailure("memo", err);
    errors.push({ stage: "memo", error: extractError(err) });
  }

  return { screen, founderScore, ambition, axes, validations, playbook, memo, errors };
}
