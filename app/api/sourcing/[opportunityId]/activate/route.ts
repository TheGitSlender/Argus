import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOutreachDraft } from "@/lib/sourcing/outreach";
import { signalSummary } from "@/lib/sourcing/rank";
import type { FounderWithScore } from "@/lib/sourcing/rank";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const { opportunityId } = await params;

  try {
    const thesis = await prisma.thesis.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    });

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        company: true,
        founders: {
          include: {
            founder: {
              include: { score: true },
            },
          },
        },
        signals: {
          select: { source: true, meta: true, occurredAt: true },
          orderBy: { ingestedAt: "desc" },
        },
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    }

    const f = opportunity.founders[0]?.founder;
    const now = new Date();
    const daysInPipeline = Math.floor(
      (now.getTime() - new Date(opportunity.createdAt).getTime()) / 86_400_000,
    );

    const founderData: FounderWithScore = {
      founderId: f?.id ?? "",
      name: f?.name ?? "Unknown",
      company: opportunity.company.name,
      score: f?.score
        ? {
            composite: f.score.composite as { value: number; low: number; high: number },
            visibilityIndex: f.score.visibilityIndex,
            capabilityVisibilityGap: f.score.capabilityVisibilityGap,
          }
        : null,
      source: opportunity.signals[0]?.source ?? "OTHER",
      signals: opportunity.signals.map((s) => ({
        source: s.source,
        meta: s.meta as Record<string, unknown> | null,
        occurredAt: s.occurredAt,
      })),
      outreach: null,
      opportunityId: opportunity.id,
      daysInPipeline,
      sector: opportunity.company.sector,
      location: ((f?.context ?? {}) as { location?: string }).location ?? null,
    };

    const sectors = thesis?.sectors ?? [];
    const draft = await generateOutreachDraft(founderData, sectors);
    const reason = signalSummary(founderData);

    const outreach = await prisma.outreach.upsert({
      where: { opportunityId },
      create: {
        opportunityId,
        status: "DRAFTED",
        draftMessage: draft,
        reason,
      },
      update: {
        status: "DRAFTED",
        draftMessage: draft,
        reason,
      },
    });

    return NextResponse.json({
      outreachId: outreach.id,
      status: outreach.status,
      draftMessage: outreach.draftMessage,
    });
  } catch (error) {
    console.error("[sourcing/activate] POST failed:", error);
    return NextResponse.json({ error: "Activation failed. Check server logs." }, { status: 500 });
  }
}
