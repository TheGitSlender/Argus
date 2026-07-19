import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runOpportunityPipeline } from "@/lib/intel/pipeline";
import {
  applyValidations,
  assembleBundle,
  saveAxisScores,
  saveFounderScore,
  saveMemo,
  savePlaybook,
  thesisConfigFromDb,
} from "@/lib/persist";

// Full pipeline for one opportunity: assemble evidence -> run -> persist all.
// Handles partial results gracefully — persists whatever succeeded, logs errors.
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const opportunity = await prisma.opportunity.findUniqueOrThrow({
      where: { id },
      include: { founders: true, company: true },
    });
    const founderId = opportunity.founders[0]?.founderId;
    if (!founderId) {
      return NextResponse.json({ error: "Opportunity has no linked founder" }, { status: 422 });
    }

    const [bundle, thesisRow] = await Promise.all([
      assembleBundle(founderId),
      prisma.thesis.findFirst({ where: { active: true } }),
    ]);

    const result = await runOpportunityPipeline(bundle, {
      thesis: thesisRow ? thesisConfigFromDb(thesisRow) : null,
      firstSignalAt: opportunity.firstSignalAt,
    });

    if (result.screen.verdict === "reject") {
      await prisma.opportunity.update({
        where: { id },
        data: { status: "DECIDED", decision: "PASS", decidedAt: new Date() },
      });
      return NextResponse.json(result);
    }

    // Persist whatever succeeded — don't force-unwrap nullable fields.
    const persistTasks: Promise<void>[] = [];

    if (result.founderScore) {
      persistTasks.push(saveFounderScore(founderId, result.founderScore, result.ambition));
    }

    if (result.validations.length > 0) {
      persistTasks.push(applyValidations(result.validations));
    }

    if (result.axes) {
      persistTasks.push(saveAxisScores(id, result.axes));
    }

    if (result.playbook) {
      persistTasks.push(savePlaybook(founderId, id, result.playbook));
    }

    if (result.memo) {
      persistTasks.push(saveMemo(id, result.memo));
    }

    persistTasks.push(
      prisma.opportunity.update({ where: { id }, data: { status: "DILIGENCE" } }).then(() => {})
    );

    await Promise.all(persistTasks);

    // Log pipeline errors to ReasoningLog for traceability.
    if (result.errors.length > 0) {
      await prisma.reasoningLog.create({
        data: {
          step: "pipeline_errors",
          model: "pipeline",
          inputRefs: { opportunityId: id, founderId, errors: result.errors } as object,
          output: JSON.stringify(result.errors),
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[pipeline] opportunity ${id} failed:`, error);
    return NextResponse.json({ error: "Pipeline run failed. Check server logs." }, { status: 500 });
  }
}
