import type { AmbitionRead, InterviewPlaybook, MemoDocument, ScreenResult, ThesisConfig, ValidationResult } from "../contracts";
import type { EvidenceBundle } from "./evidence";
import { renderBandSummary, scoreFounder, type FounderScoreResult } from "./founder-score";
import { generatePlaybook, readAmbition, scoreAxis, screenApplication, validateClaim } from "./stages";
import { generateMemo, type AxisSet } from "./memo";

// =============================================================================
// The full opportunity pipeline, DB-free: bundle in -> decision-ready packet
// out. Route handlers wrap this with persistence (save scores, append history,
// update claims from validations, store memo on the opportunity).
// =============================================================================

export interface PipelineResult {
  screen: ScreenResult;
  founderScore: FounderScoreResult | null;
  ambition: AmbitionRead | null;
  axes: AxisSet | null;
  validations: Array<{ claimId: string; result: ValidationResult }>;
  playbook: InterviewPlaybook | null;
  memo: MemoDocument | null;
}

export interface PipelineOptions {
  thesis?: ThesisConfig | null;
  firstSignalAt?: Date | null;
  /** Validate at most this many claims (cost control). Unverified first. */
  maxClaimValidations?: number;
}

export async function runOpportunityPipeline(
  bundle: EvidenceBundle,
  opts: PipelineOptions = {}
): Promise<PipelineResult> {
  const screen = await screenApplication(bundle);
  if (screen.verdict === "reject") {
    return { screen, founderScore: null, ambition: null, axes: null, validations: [], playbook: null, memo: null };
  }

  // Founder score, ambition read, and claim validations are independent.
  const claimsToValidate = [...bundle.claims]
    .sort((a, b) => (a.verificationStatus === "UNVERIFIED" ? -1 : 1) - (b.verificationStatus === "UNVERIFIED" ? -1 : 1))
    .slice(0, opts.maxClaimValidations ?? 5);

  const [founderScore, ambition, validations] = await Promise.all([
    scoreFounder(bundle),
    readAmbition(bundle),
    Promise.all(
      claimsToValidate.map(async (claim) => ({ claimId: claim.id, result: await validateClaim(claim, bundle) }))
    ),
  ]);

  const bandSummary = renderBandSummary(founderScore.snapshot);

  const [founderAxis, marketAxis, ideaAxis, playbook] = await Promise.all([
    scoreAxis("founder", bundle, { founderScoreSummary: bandSummary }),
    scoreAxis("market", bundle, { thesis: opts.thesis }),
    scoreAxis("idea_vs_market", bundle),
    generatePlaybook(bandSummary, bundle),
  ]);
  const axes: AxisSet = { founder: founderAxis, market: marketAxis, idea_vs_market: ideaAxis };

  const { memo } = await generateMemo({
    bundle,
    bandSummary,
    axes,
    playbook,
    ambition,
    thesis: opts.thesis,
    firstSignalAt: opts.firstSignalAt,
  });

  return { screen, founderScore, ambition, axes, validations, playbook, memo };
}
