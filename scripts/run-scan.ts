/**
 * Live outbound sourcing run: GitHub scan (thesis-driven, hidden-gem tuned)
 * -> intake -> ranked sourcing pool report.
 * Usage: npx tsx --env-file=.env scripts/run-scan.ts [--max-per-sector 5]
 */
import { prisma } from "../lib/db";
import { scanGitHub } from "../lib/sourcing/github";
import { rankFounders, type FounderWithScore } from "../lib/sourcing/rank";

const argIdx = process.argv.indexOf("--max-per-sector");
const MAX = argIdx === -1 ? 5 : Number(process.argv[argIdx + 1]);

async function main() {
  const thesis = await prisma.thesis.findFirst({ where: { active: true } });
  if (!thesis) throw new Error("No active thesis");
  console.log(`Scanning GitHub for sectors: ${thesis.sectors.join(", ")} (max ${MAX}/sector)\n`);

  const results = MAX > 0 ? await scanGitHub(thesis.sectors, MAX) : [];
  console.log(`\nDiscovered ${results.length} founders:`);
  for (const r of results) {
    console.log(`  ${r.knownFounder ? "↺ known" : "★ NEW  "} ${r.name} (@${r.login}) -> opportunity ${r.opportunityId}`);
  }

  // Rank the full outbound pool the same way GET /api/sourcing does.
  const opportunities = await prisma.opportunity.findMany({
    where: { track: "OUTBOUND", signals: { some: { source: "GITHUB" } } },
    include: {
      company: true,
      founders: { include: { founder: { include: { score: true } } } },
      outreach: true,
      signals: { select: { source: true, meta: true, occurredAt: true }, orderBy: { ingestedAt: "desc" } },
    },
  });
  const pool: FounderWithScore[] = opportunities.map((opp) => {
    const f = opp.founders[0]?.founder;
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
      signals: opp.signals.map((s) => ({ source: s.source, meta: s.meta as Record<string, unknown> | null, occurredAt: s.occurredAt })),
      outreach: opp.outreach,
      opportunityId: opp.id,
      daysInPipeline: Math.floor((Date.now() - opp.createdAt.getTime()) / 86_400_000),
      sector: opp.company.sector,
      location: ((f?.context ?? {}) as { location?: string }).location ?? null,
    };
  });

  const ranked = rankFounders(pool, thesis.sectors, thesis.geographies);
  console.log(`\nOutbound sourcing pool, ranked (capability + thesis fit + gap, never popularity):`);
  ranked.slice(0, 12).forEach((r, i) => {
    const cap = r.score?.composite?.value ?? "unscored";
    console.log(
      `  ${String(i + 1).padStart(2)}. rank ${String(r.rankScore).padStart(3)}  ${r.name.padEnd(28)} cap ${String(cap).padEnd(9)} gap ${r.score?.capabilityVisibilityGap ?? "-"}`
    );
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
