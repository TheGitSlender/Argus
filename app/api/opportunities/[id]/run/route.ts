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

    await saveFounderScore(founderId, result.founderScore!, result.ambition);
    await Promise.all([
      applyValidations(result.validations),
      saveAxisScores(id, result.axes!),
      savePlaybook(founderId, id, result.playbook!),
      saveMemo(id, result.memo!),
      prisma.opportunity.update({ where: { id }, data: { status: "DILIGENCE" } }),
    ]);

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[pipeline] opportunity ${id} failed:`, error);
    return NextResponse.json({ error: "Pipeline run failed. Check server logs." }, { status: 500 });
  }
}
