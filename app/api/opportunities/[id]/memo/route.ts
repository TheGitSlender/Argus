import { createOpenAI } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { prisma } from "@/lib/db";
import { memoStreamSchema, type MemoDocument } from "@/lib/contracts";
import { MODELS } from "@/lib/llm";
import { renderBandSummary } from "@/lib/intel/founder-score";
import { adversarialPass, renderAdversarialBullets, renderAmbitionSummary } from "@/lib/intel/memo";
import { renderEvidence } from "@/lib/intel/evidence";
import { MEMO_SYSTEM, memoContext } from "@/lib/intel/prompts";
import { ambitionReadSchema } from "@/lib/contracts";
import { loadMemoInputs, saveMemo } from "@/lib/persist";

// Streaming memo: partial-JSON tokens stream to the UI as sections fill in
// (AI SDK streamObject). On finish the memo persists exactly like the batch
// path. The adversarial pass runs first through runLLM (logged); the streamed
// call itself is logged to ReasoningLog manually in onFinish.
export const maxDuration = 300;

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inputs = await loadMemoInputs(id);
  const bandSummary = renderBandSummary(inputs.snapshot);
  const evidence = renderEvidence(inputs.bundle);

  let bearCase: string;
  try {
    const adversarial = await adversarialPass(bandSummary, inputs.bundle);
    bearCase = renderAdversarialBullets(adversarial);
  } catch (err) {
    console.warn(`[memo-stream] adversarial pass failed for ${id}, using placeholder:`, err);
    bearCase = "Adversarial analysis unavailable — this section was skipped due to a processing error.";
  }

  const axisSummary = [...inputs.axisRows.values()]
    .map((a) => `- ${a.axis}: ${a.value} (${a.trend.toLowerCase()}) — ${a.rationale}`)
    .join("\n");

  const scoreRow = await prisma.founderScore.findUnique({ where: { founderId: inputs.founderId } });
  const ambition = scoreRow?.ambitionRead ? ambitionReadSchema.safeParse(scoreRow.ambitionRead) : null;

  const prompt = memoContext(
    evidence,
    bandSummary,
    axisSummary,
    bearCase,
    inputs.thesis ? JSON.stringify(inputs.thesis) : "",
    inputs.playbookSummary,
    ambition?.success ? renderAmbitionSummary(ambition.data) : ""
  );

  const started = Date.now();
  const result = streamObject({
    model: openai(MODELS.heavy),
    schema: memoStreamSchema,
    system: MEMO_SYSTEM,
    prompt,
    onFinish: async ({ object, usage }) => {
      if (!object) return;
      const memo: MemoDocument = {
        ...object,
        optionalSections: Object.fromEntries(object.optionalSections.map((s) => [s.title, s.content])),
        bearCase,
        signalToDecisionHours: inputs.opportunity.firstSignalAt
          ? Math.round(((Date.now() - inputs.opportunity.firstSignalAt.getTime()) / 36e5) * 10) / 10
          : null,
      };
      await saveMemo(id, memo);
      await prisma.reasoningLog.create({
        data: {
          step: "memo_stream",
          model: MODELS.heavy,
          inputRefs: { opportunityId: id, founderId: inputs.founderId },
          output: JSON.stringify(object),
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
          latencyMs: Date.now() - started,
        },
      });
    },
  });

  return result.toTextStreamResponse();
}
