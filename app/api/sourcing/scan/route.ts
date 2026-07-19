import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scanGitHub } from "@/lib/sourcing/github";
import { scanDevPost } from "@/lib/sourcing/devpost";
import { rankFounders } from "@/lib/sourcing/rank";
import { generateReason } from "@/lib/sourcing/outreach";
import type { FounderWithScore } from "@/lib/sourcing/rank";

export const maxDuration = 120;

export async function POST() {
  const started = Date.now();

  try {
    const thesis = await prisma.thesis.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    });

    const sectors = thesis?.sectors ?? [];
    const geos = thesis?.geographies ?? [];

    // Run both scanners in parallel — resilient to individual failures.
    const [githubResult, devpostResult] = await Promise.allSettled([
      scanGitHub(sectors),
      scanDevPost(sectors),
    ]);

    const githubFounders = githubResult.status === "fulfilled" ? githubResult.value : [];
    const devpostFounders = devpostResult.status === "fulfilled" ? devpostResult.value : [];

    const newCount = githubFounders.length + devpostFounders.length;

    // Re-query all outbound opportunities (newly created + existing).
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

    const ranked = rankFounders(founders, sectors, geos);

    // Generate reasons for the top 10.
    const top10 = ranked.slice(0, 10);
    for (const founder of top10) {
      try {
        founder.reason = await generateReason(founder, sectors);
      } catch {
        founder.reason = `${founder.name} — ${founder.source} founder matching thesis.`;
      }
    }

    return NextResponse.json({
      newFounders: newCount,
      totalOutbound: ranked.length,
      topRanked: top10,
      scanDuration: Date.now() - started,
      errors: {
        github: githubResult.status === "rejected" ? String(githubResult.reason) : null,
        devpost: devpostResult.status === "rejected" ? String(devpostResult.reason) : null,
      },
    });
  } catch (error) {
    console.error("[sourcing/scan] POST failed:", error);
    return NextResponse.json({ error: "Scan failed. Check server logs." }, { status: 500 });
  }
}
