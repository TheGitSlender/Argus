/**
 * Batch-score corpus opportunities through the full pipeline, with live
 * progress and a final filtering/ranking report.
 *
 * Usage: npx tsx --env-file=.env scripts/batch-score.ts [--limit 6] [--all]
 * Cost: ~30 LLM calls per founder (cached on re-runs via ReasoningLog).
 */
import { prisma } from "../lib/db";
import { runOpportunityPipeline } from "../lib/intel/pipeline";
import {
  applyValidations,
  assembleBundle,
  saveAxisScores,
  saveFounderScore,
  saveMemo,
  savePlaybook,
  thesisConfigFromDb,
} from "../lib/persist";

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const LIMIT = ALL ? Infinity : Number(args[args.indexOf("--limit") + 1] || 6);
const CONCURRENCY = 2;

interface Candidate {
  opportunityId: string;
  founderId: string;
  name: string;
  company: string;
  archetype: string;
}

async function pickCandidates(): Promise<Candidate[]> {
  const opportunities = await prisma.opportunity.findMany({
    where: { founders: { some: { founder: { score: null } } } },
    include: {
      company: true,
      founders: { include: { founder: true } },
      signals: { select: { meta: true }, take: 5 },
    },
    orderBy: { createdAt: "asc" },
  });

  const candidates: Candidate[] = [];
  const seenFounders = new Set<string>();
  for (const opp of opportunities) {
    const founder = opp.founders[0]?.founder;
    if (!founder || seenFounders.has(founder.id)) continue;
    seenFounders.add(founder.id);
    const archetype =
      (opp.signals.map((s) => (s.meta as Record<string, unknown> | null)?.archetype).find(Boolean) as string) ??
      "unknown";
    candidates.push({ opportunityId: opp.id, founderId: founder.id, name: founder.name, company: opp.company.name, archetype });
  }

  if (ALL) return candidates;
  // Round-robin across archetypes so the demo run is representative.
  const byArchetype = new Map<string, Candidate[]>();
  for (const c of candidates) (byArchetype.get(c.archetype) ?? byArchetype.set(c.archetype, []).get(c.archetype)!).push(c);
  const picked: Candidate[] = [];
  const queues = [...byArchetype.values()];
  let i = 0;
  while (picked.length < Math.min(LIMIT, candidates.length) && queues.some((q) => q.length)) {
    const q = queues[i % queues.length];
    i++;
    const c = q.shift();
    if (c) picked.push(c);
  }
  return picked;
}

async function scoreOne(c: Candidate, thesis: ReturnType<typeof thesisConfigFromDb> | null) {
  const started = Date.now();
  console.log(`\n▶ ${c.name} (${c.archetype}) — ${c.company}`);
  const opp = await prisma.opportunity.findUniqueOrThrow({ where: { id: c.opportunityId } });
  const bundle = await assembleBundle(c.founderId);
  console.log(`  evidence: ${bundle.signals.length} signals, ${bundle.claims.length} claims`);

  const result = await runOpportunityPipeline(bundle, { thesis, firstSignalAt: opp.firstSignalAt });

  if (result.screen.verdict === "reject") {
    await prisma.opportunity.update({
      where: { id: c.opportunityId },
      data: { status: "DECIDED", decision: "PASS", decidedAt: new Date() },
    });
    console.log(`  ✖ FILTERED OUT at screen: ${result.screen.reason}`);
    return { c, screened: true as const };
  }

  await saveFounderScore(c.founderId, result.founderScore!, result.ambition);
  await Promise.all([
    applyValidations(result.validations),
    saveAxisScores(c.opportunityId, result.axes!),
    savePlaybook(c.founderId, c.opportunityId, result.playbook!),
    saveMemo(c.opportunityId, result.memo!),
  ]);

  const s = result.founderScore!.snapshot;
  console.log(
    `  ✓ composite ${s.composite.value} [${s.composite.low}-${s.composite.high}] | visibility ${s.visibilityIndex} | gap ${s.capabilityVisibilityGap >= 0 ? "+" : ""}${s.capabilityVisibilityGap}`
  );
  console.log(
    `  axes F/M/I: ${result.axes!.founder.value}/${result.axes!.market.value}/${result.axes!.idea_vs_market.value} | ambition: ${result.ambition!.ambitionLevel}, hype ${result.ambition!.hypeRisk} | decision: ${result.memo!.decision.toUpperCase()}`
  );
  if (result.errors.length) console.log(`  ⚠ degraded stages: ${result.errors.map((e) => e.stage).join(", ")}`);
  console.log(`  (${Math.round((Date.now() - started) / 1000)}s)`);
  return { c, screened: false as const };
}

async function main() {
  const thesisRow = await prisma.thesis.findFirst({ where: { active: true } });
  const thesis = thesisRow ? thesisConfigFromDb(thesisRow) : null;
  const candidates = await pickCandidates();
  console.log(`Batch-scoring ${candidates.length} unscored founders (concurrency ${CONCURRENCY})`);
  console.log(`Thesis lens: ${thesis?.name ?? "(none)"} — sectors ${thesis?.sectors.join("/") ?? "-"}`);

  let screenedOut = 0;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const chunk = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((c) => scoreOne(c, thesis)));
    for (const r of results) {
      if (r.status === "rejected") console.error(`  ✖ pipeline error: ${r.reason}`);
      else if (r.value.screened) screenedOut++;
    }
  }

  // ---- Final report: how the system filters and ranks -----------------------
  const scored = await prisma.founder.findMany({
    where: { score: { isNot: null } },
    include: {
      score: true,
      opportunities: {
        include: { opportunity: { include: { company: true, axisScores: true } } },
      },
    },
  });

  type Row = {
    name: string;
    company: string;
    composite: { value: number; low: number; high: number };
    visibility: number;
    gap: number;
    decision: string;
    axes: string;
    thesisFit: boolean;
  };
  const rows: Row[] = scored.map((f) => {
    const opp = f.opportunities[f.opportunities.length - 1]?.opportunity;
    const composite = f.score!.composite as Row["composite"];
    const latestByAxis = new Map<string, number>();
    for (const a of opp?.axisScores ?? []) if (!latestByAxis.has(a.axis)) latestByAxis.set(a.axis, a.value);
    const sector = opp?.company.sector?.toLowerCase() ?? "";
    return {
      name: f.name,
      company: opp?.company.name ?? "-",
      composite,
      visibility: f.score!.visibilityIndex,
      gap: f.score!.capabilityVisibilityGap,
      decision: opp?.decision ?? "-",
      axes: ["FOUNDER", "MARKET", "IDEA_VS_MARKET"].map((a) => latestByAxis.get(a) ?? "-").join("/"),
      thesisFit: Boolean(thesis?.sectors.some((s) => sector.includes(s.toLowerCase()) || s.toLowerCase().includes(sector))),
    };
  });

  const fmt = (r: Row, rank: number) =>
    `${String(rank).padStart(2)}. ${r.name.padEnd(22)} ${r.company.padEnd(20)} ${String(r.composite.value).padStart(5)} [${r.composite.low}-${r.composite.high}]  vis ${String(r.visibility).padStart(5)}  gap ${(r.gap >= 0 ? "+" : "") + r.gap}`.padEnd(105) +
    ` axes ${r.axes.padEnd(10)} ${r.thesisFit ? "✓thesis" : "       "} ${r.decision}`;

  console.log(`\n${"=".repeat(110)}\nRANKING A — Investment conviction (thesis fit first, then composite capability; axes shown, never averaged)\n${"=".repeat(110)}`);
  [...rows]
    .sort((a, b) => Number(b.thesisFit) - Number(a.thesisFit) || b.composite.value - a.composite.value)
    .forEach((r, i) => console.log(fmt(r, i + 1)));

  console.log(`\n${"=".repeat(110)}\nRANKING B — 💎 Hidden Gems (capability − visibility gap): who everyone else is missing\n${"=".repeat(110)}`);
  [...rows]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10)
    .forEach((r, i) => console.log(fmt(r, i + 1)));

  console.log(`\nFiltering summary: ${screenedOut} screened out this run · decisions: ${JSON.stringify(Object.fromEntries(rows.reduce((m, r) => m.set(r.decision, (m.get(r.decision) ?? 0) + 1), new Map())))}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
