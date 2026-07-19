import { MODELS, runLLM } from "../llm";
import {
  adversarialOutputSchema,
  memoDocumentSchema,
  type AdversarialOutput,
  type AmbitionRead,
  type AxisScoreOutput,
  type InterviewPlaybook,
  type MemoDocument,
  type ThesisConfig,
} from "../contracts";
import { renderEvidence, type EvidenceBundle } from "./evidence";
import { ADVERSARIAL_SYSTEM, MEMO_SYSTEM, adversarialPrompt, memoPrompt } from "./prompts";

// Stage 7 (adversarial pass) + stage 8 (memo assembly).

export interface AxisSet {
  founder: AxisScoreOutput;
  market: AxisScoreOutput;
  idea_vs_market: AxisScoreOutput;
}

export function renderAxisSummary(axes: AxisSet): string {
  const fmt = (label: string, a: AxisScoreOutput) =>
    `- ${label}: ${a.value} (${a.trend}) — ${a.rationale}`;
  return [fmt("FOUNDER", axes.founder), fmt("MARKET", axes.market), fmt("IDEA VS MARKET", axes.idea_vs_market)].join("\n");
}

export function renderAmbitionSummary(a: AmbitionRead): string {
  return [
    `- ambition level: ${a.ambitionLevel} | learning velocity: ${a.learningVelocity} | hype risk: ${a.hypeRisk}`,
    `- idea-agnostic verdict: ${a.ideaAgnosticVerdict}`,
    a.resourcefulnessSignals.length ? `- resourcefulness: ${a.resourcefulnessSignals.join("; ")}` : null,
    a.persistenceEvidence.length ? `- persistence: ${a.persistenceEvidence.join("; ")}` : null,
    `- rationale: ${a.rationale}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Render structured adversarial output to formatted markdown for the memo prompt. */
export function renderAdversarialBullets(output: AdversarialOutput): string {
  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...output.bullets].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
  const lines = sorted.map((b) => {
    const refs = b.evidenceRefs.length > 0 ? ` (evidence: ${b.evidenceRefs.join(", ")})` : "";
    return `- [${b.severity.toUpperCase()}] ${b.point}${refs}`;
  });
  return `BEAR CASE (severity-ranked):\n${lines.join("\n")}\n\nSummary: ${output.summary}`;
}

export async function adversarialPass(bandSummary: string, bundle: EvidenceBundle): Promise<AdversarialOutput> {
  const r = await runLLM({
    step: "adversarial_pass",
    model: MODELS.heavy,
    system: ADVERSARIAL_SYSTEM,
    prompt: adversarialPrompt(bandSummary, renderEvidence(bundle)),
    schema: adversarialOutputSchema,
    inputRefs: { founderId: bundle.founder.id ?? null },
  });
  return r.parsed;
}

export interface GenerateMemoOptions {
  bundle: EvidenceBundle;
  bandSummary: string;
  axes: AxisSet;
  playbook: InterviewPlaybook;
  ambition?: AmbitionRead | null;
  thesis?: ThesisConfig | null;
  /** For the signal->decision elapsed-time instrumentation. */
  firstSignalAt?: Date | null;
}

export async function generateMemo(opts: GenerateMemoOptions): Promise<{ memo: MemoDocument; bearCase: string }> {
  let adversarial: AdversarialOutput;
  try {
    adversarial = await adversarialPass(opts.bandSummary, opts.bundle);
  } catch (err) {
    console.warn("[memo] adversarial pass failed, using placeholder:", err);
    adversarial = {
      bullets: [{ severity: "low", point: "Adversarial analysis unavailable due to processing error.", evidenceRefs: [] }],
      summary: "Bear case could not be generated.",
    };
  }
  const bearCase = renderAdversarialBullets(adversarial);

  const playbookSummary = opts.playbook.questions
    .map((q) => `- [${q.targetDimension}] ${q.question} (${q.expectedBandReduction})`)
    .join("\n");

  const r = await runLLM({
    step: "memo_assembly",
    model: MODELS.heavy,
    system: MEMO_SYSTEM,
    prompt: memoPrompt(
      renderEvidence(opts.bundle),
      opts.bandSummary,
      renderAxisSummary(opts.axes),
      bearCase,
      opts.thesis ? JSON.stringify(opts.thesis) : "",
      playbookSummary,
      opts.ambition ? renderAmbitionSummary(opts.ambition) : ""
    ),
    schema: memoDocumentSchema,
    maxTokens: 8192,
    inputRefs: {
      founderId: opts.bundle.founder.id ?? null,
      signalIds: opts.bundle.signals.map((s) => s.id),
      claimIds: opts.bundle.claims.map((c) => c.id),
    },
  });

  const memo: MemoDocument = {
    ...r.parsed,
    bearCase,
    signalToDecisionHours: opts.firstSignalAt
      ? Math.round(((Date.now() - opts.firstSignalAt.getTime()) / 36e5) * 10) / 10
      : null,
  };
  return { memo, bearCase };
}
