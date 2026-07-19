import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rankFounders } from "@/lib/sourcing/rank";
import type { FounderWithScore } from "@/lib/sourcing/rank";

export async function GET() {
  try {
    const thesis = await prisma.thesis.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    });

    const opportunities = await prisma.opportunity.findMany({
      where: { track: "OUTBOUND" },
      include: {
        company: true,
        founders: {
          include: {
            founder: {
              include: { score: true },
            },
          },
        },
        outreach: true,
        signals: {
          select: { source: true, meta: true, occurredAt: true },
          orderBy: { ingestedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const founders: FounderWithScore[] = opportunities.map((opp) => {
      const f = opp.founders[0]?.founder;
      const now = new Date();
      const daysInPipeline = Math.floor(
        (now.getTime() - new Date(opp.createdAt).getTime()) / 86_400_000,
      );

      return {
        founderId: f?.id ?? "",
        name: f?.name ?? "Unknown",
        company: opp.company.name,
        score: f?.score
          ? {
              composite: f.score.composite as { value: number; low: number; high: number },
              visibilityIndex: f.score.visibilityIndex,
              capabilityVisibilityGap: f.score.capabilityVisibilityGap,
            }
          : null,
        source: opp.signals[0]?.source ?? "OTHER",
        signals: opp.signals.map((s) => ({
          source: s.source,
          meta: s.meta as Record<string, unknown> | null,
          occurredAt: s.occurredAt,
        })),
        outreach: opp.outreach,
        opportunityId: opp.id,
        daysInPipeline,
      };
    });

    const thesisSectors = thesis?.sectors ?? [];
    const thesisGeos = thesis?.geographies ?? [];
    const ranked = rankFounders(founders, thesisSectors, thesisGeos);

    const stats = {
      total: ranked.length,
      identified: ranked.filter((f) => !f.outreach || f.outreach.status === "IDENTIFIED").length,
      drafted: ranked.filter((f) => f.outreach?.status === "DRAFTED").length,
      sent: ranked.filter((f) => f.outreach?.status === "SENT").length,
      converted: ranked.filter((f) => f.outreach?.status === "CONVERTED").length,
    };

    return NextResponse.json({ founders: ranked, stats });
  } catch (error) {
    console.error("[sourcing] GET failed:", error);
    return NextResponse.json({ error: "Failed to load sourcing data." }, { status: 500 });
  }
}
