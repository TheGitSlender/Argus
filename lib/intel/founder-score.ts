import { MODELS, runLLM } from "../llm";
import {
  DIMENSION_KEYS,
  dimensionSampleSchema,
  type DimensionKey,
  type DimensionSample,
  type FounderScoreSnapshot,
  type ScoreBand,
} from "../contracts";
import { computeCoverage, renderEvidence, type EvidenceBundle } from "./evidence";
import { bandFromSamples, compositeBand } from "./band-math";
import { ANALYST_SYSTEM, DIMENSION_RUBRICS, dimensionPrompt } from "./prompts";
import { computeVisibilityIndex, deriveVisibilityInputs } from "./visibility";

// =============================================================================
// The Founder Score engine (crown jewel).
// Confidence bands come from 3x self-consistency sampling at temperature ~0.8:
// the SPREAD across runs is epistemic uncertainty — never ask the model how
// confident it is. Coverage of the evidence widens bands further.
// =============================================================================

const SAMPLES_PER_DIMENSION = 3;
const SAMPLING_TEMPERATURE = 0.8;

export interface DimensionResult {
  band: ScoreBand;
  samples: DimensionSample[];
}

export interface FounderScoreResult {
  snapshot: FounderScoreSnapshot;
  dimensions: Record<DimensionKey, DimensionResult>;
  coverage: number;
}

export async function scoreDimension(
  dimension: DimensionKey,
  bundle: EvidenceBundle,
  coverage: number
): Promise<DimensionResult> {
  const evidence = renderEvidence(bundle);
  const prompt = dimensionPrompt(DIMENSION_RUBRICS[dimension], evidence);

  const samples = await Promise.all(
    Array.from({ length: SAMPLES_PER_DIMENSION }, (_, sampleIndex) =>
      runLLM({
        step: `score_${dimension}`,
        model: MODELS.score,
        system: ANALYST_SYSTEM,
        prompt,
        temperature: SAMPLING_TEMPERATURE,
        schema: dimensionSampleSchema,
        sampleIndex,
        inputRefs: {
          founderId: bundle.founder.id ?? null,
          signalIds: bundle.signals.map((s) => s.id),
          claimIds: bundle.claims.map((c) => c.id),
        },
      }).then((r) => r.parsed)
    )
  );

  return {
    band: bandFromSamples(
      samples.map((s) => s.score),
      coverage
    ),
    samples,
  };
}

/** Score all 5 dimensions (15 parallel calls), then composite + visibility. */
export async function scoreFounder(bundle: EvidenceBundle): Promise<FounderScoreResult> {
  const coverage = computeCoverage(bundle);

  const results = await Promise.all(
    DIMENSION_KEYS.map(async (dim) => [dim, await scoreDimension(dim, bundle, coverage)] as const)
  );
  const dimensions = Object.fromEntries(results) as Record<DimensionKey, DimensionResult>;

  const composite = compositeBand(DIMENSION_KEYS.map((d) => dimensions[d].band));
  const visibilityIndex = computeVisibilityIndex(deriveVisibilityInputs(bundle));

  const snapshot: FounderScoreSnapshot = {
    execution: dimensions.execution.band,
    technicalDepth: dimensions.technicalDepth.band,
    problemInsight: dimensions.problemInsight.band,
    resourcefulness: dimensions.resourcefulness.band,
    momentum: dimensions.momentum.band,
    composite,
    visibilityIndex,
    capabilityVisibilityGap: Math.round((composite.value - visibilityIndex) * 10) / 10,
  };

  return { snapshot, dimensions, coverage };
}

/** Compact text rendering of bands for downstream prompts (axis, playbook, delta). */
export function renderBandSummary(snapshot: FounderScoreSnapshot): string {
  const fmt = (label: string, b: ScoreBand) =>
    `- ${label}: ${b.value} [${b.low}-${b.high}]${b.coverage != null ? ` (coverage ${b.coverage})` : ""} — width ${Math.round((b.high - b.low) * 10) / 10}`;
  return [
    fmt("Execution", snapshot.execution),
    fmt("Technical Depth", snapshot.technicalDepth),
    fmt("Problem Insight", snapshot.problemInsight),
    fmt("Resourcefulness", snapshot.resourcefulness),
    fmt("Momentum", snapshot.momentum),
    fmt("Composite", snapshot.composite),
    `- Visibility Index: ${snapshot.visibilityIndex} | capability-visibility gap: ${snapshot.capabilityVisibilityGap}`,
  ].join("\n");
}
