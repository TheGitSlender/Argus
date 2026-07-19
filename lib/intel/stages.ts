import { MODELS, runLLM } from "../llm";
import {
  axisScoreOutputSchema,
  deltaUpdateOutputSchema,
  interviewPlaybookSchema,
  screenResultSchema,
  validationResultSchema,
  type AxisKey,
  type AxisScoreOutput,
  type DeltaUpdateOutput,
  type InterviewPlaybook,
  type ScreenResult,
  type ThesisConfig,
  type ValidationResult,
} from "../contracts";
import { renderEvidence, type EvidenceBundle, type EvidenceClaim, type EvidenceSignal } from "./evidence";
import {
  AMBITION_SYSTEM,
  AXIS_SYSTEM,
  DELTA_SYSTEM,
  EXTRACT_SYSTEM,
  NLQUERY_SYSTEM,
  PLAYBOOK_SYSTEM,
  SCREEN_SYSTEM,
  VALIDATOR_SYSTEM,
  ambitionPrompt,
  axisPrompts,
  deltaPrompt,
  extractPrompt,
  nlQueryPrompt,
  playbookPrompt,
  screenPrompt,
  validatorPrompt,
} from "./prompts";
import {
  ambitionReadSchema,
  extractionOutputSchema,
  nlQueryFilterSchema,
  type AmbitionRead,
  type ExtractionOutput,
  type NlQueryFilter,
} from "../contracts";

// Remaining pipeline stages. Each is a thin, typed wrapper: render evidence ->
// one runLLM call -> validated contract output. DB reads/writes happen in the
// route handlers that call these, not here.

/** Stage 1: extract atomic claims from one raw signal. */
export async function extractClaims(signal: EvidenceSignal): Promise<ExtractionOutput> {
  const r = await runLLM({
    step: "extract_claims",
    model: MODELS.extract,
    system: EXTRACT_SYSTEM,
    prompt: extractPrompt(signal.rawContent),
    schema: extractionOutputSchema,
    inputRefs: { signalId: signal.id },
  });
  return r.parsed;
}

/** NL query bar: "technical founder, Berlin, AI infra, no prior VC" -> filter. */
export async function nlQueryToFilter(query: string): Promise<NlQueryFilter> {
  const r = await runLLM({
    step: "nl_query",
    model: MODELS.extract,
    system: NLQUERY_SYSTEM,
    prompt: nlQueryPrompt(query),
    schema: nlQueryFilterSchema,
    inputRefs: { query },
  });
  return r.parsed;
}

/** Stage 3: fast first-pass screen. Permissive by design — cold-start proceeds. */
export async function screenApplication(bundle: EvidenceBundle): Promise<ScreenResult> {
  const r = await runLLM({
    step: "screen",
    model: MODELS.extract,
    system: SCREEN_SYSTEM,
    prompt: screenPrompt(renderEvidence(bundle)),
    schema: screenResultSchema,
    inputRefs: { founderId: bundle.founder.id ?? null },
  });
  return r.parsed;
}

/** Ambition & Drive read: idea-agnostic, softer than the scored dimensions.
 * Answers "would we still back this person if this exact idea died?" */
export async function readAmbition(bundle: EvidenceBundle): Promise<AmbitionRead> {
  const r = await runLLM({
    step: "ambition_read",
    model: MODELS.score,
    system: AMBITION_SYSTEM,
    prompt: ambitionPrompt(renderEvidence(bundle)),
    schema: ambitionReadSchema,
    inputRefs: { founderId: bundle.founder.id ?? null },
  });
  return r.parsed;
}

/** Stage 5: one axis of the 3-axis screening. Never average the axes. */
export async function scoreAxis(
  axis: AxisKey,
  bundle: EvidenceBundle,
  opts: { founderScoreSummary?: string; thesis?: ThesisConfig | null } = {}
): Promise<AxisScoreOutput> {
  const extra =
    axis === "founder"
      ? opts.founderScoreSummary ?? "(no persistent founder score yet — first contact)"
      : axis === "market" && opts.thesis
        ? JSON.stringify(opts.thesis)
        : "";
  const r = await runLLM({
    step: `axis_${axis}`,
    model: MODELS.score,
    system: AXIS_SYSTEM,
    prompt: axisPrompts[axis](renderEvidence(bundle), extra),
    schema: axisScoreOutputSchema,
    inputRefs: { founderId: bundle.founder.id ?? null, axis },
  });
  return r.parsed;
}

/** Stage 6: validate one claim against all other evidence. */
export async function validateClaim(
  claim: EvidenceClaim,
  bundle: EvidenceBundle
): Promise<ValidationResult> {
  const claimLine = `[claim:${claim.id}] (category=${claim.category}${claim.sourceLocation ? ` | at=${claim.sourceLocation}` : ""}) ${claim.text}`;
  const r = await runLLM({
    step: "validate_claim",
    model: MODELS.score,
    system: VALIDATOR_SYSTEM,
    prompt: validatorPrompt(claimLine, renderEvidence(bundle)),
    schema: validationResultSchema,
    inputRefs: { claimId: claim.id },
  });
  return {
    ...r.parsed,
    contradictingSignalIds: r.parsed.contradictingSignalIds.map((id) => id.replace(/^signal:/, "")),
  };
}

/** Stage 8a: the Interview Playbook — questions targeting the widest bands. */
export async function generatePlaybook(
  bandSummary: string,
  bundle: EvidenceBundle
): Promise<InterviewPlaybook> {
  const r = await runLLM({
    step: "interview_playbook",
    model: MODELS.heavy,
    system: PLAYBOOK_SYSTEM,
    prompt: playbookPrompt(bandSummary, renderEvidence(bundle)),
    schema: interviewPlaybookSchema,
    inputRefs: { founderId: bundle.founder.id ?? null },
  });
  return r.parsed;
}

/** Tracking loop: one new signal -> targeted band updates (never full rescore). */
export async function deltaUpdate(
  bandSummary: string,
  newSignal: EvidenceSignal,
  bundle: EvidenceBundle,
  priorDeltaSummary?: string
): Promise<DeltaUpdateOutput> {
  const signalLine = `[signal:${newSignal.id}] source=${newSignal.source} ${newSignal.rawContent}`;
  const r = await runLLM({
    step: "delta_update",
    model: MODELS.score,
    system: DELTA_SYSTEM,
    prompt: deltaPrompt(bandSummary, signalLine, renderEvidence(bundle), priorDeltaSummary),
    schema: deltaUpdateOutputSchema,
    inputRefs: { founderId: bundle.founder.id ?? null, causeSignalId: newSignal.id },
  });
  return r.parsed;
}
