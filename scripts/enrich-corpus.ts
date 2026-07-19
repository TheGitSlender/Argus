/**
 * Coverage enrichment: founders with <3 signals get one generated follow-up
 * signal (archetype-consistent, never contradicting existing evidence),
 * ingested through the REAL pipeline: claims -> delta update -> ScoreHistory.
 * Band widths are then recalibrated to the new deterministic coverage.
 *
 * Usage: npx tsx --env-file=.env scripts/enrich-corpus.ts [--limit N]
 */
import { z } from "zod";
import { prisma } from "../lib/db";
import { MODELS, runLLM } from "../lib/llm";
import { assembleBundle, applyDeltaUpdates, snapshotFromDb } from "../lib/persist";
import { computeCoverage } from "../lib/intel/evidence";
import { deltaUpdate, extractClaims } from "../lib/intel/stages";
import { renderBandSummary } from "../lib/intel/founder-score";
import { renderEvidence } from "../lib/intel/evidence";
import { DIMENSION_KEYS, scoreBandSchema, type ScoreBand } from "../lib/contracts";
import { compositeBand } from "../lib/intel/band-math";

const LIMIT = Number(process.argv[process.argv.indexOf("--limit") + 1]) || Infinity;
const CONCURRENCY = 3;

const generatedSignalSchema = z.object({
  source: z.enum(["GITHUB", "BLOG", "WEB", "PRODUCT_HUNT", "HACKER_NEWS", "DEVPOST"]),
  daysAfterLatest: z.number().int().min(3).max(45),
  rawContent: z.string().min(80),
});

const ARCHETYPE_STEER: Record<string, string> = {
  hype: "The founder's pattern is publicity without substance. The follow-up should be MORE visibility activity (a podcast, a thread, a waitlist milestone) still with no shipped artifact, no users, no measured progress. Stay consistent with that pattern.",
  contradiction: "Write a neutral operational update (hiring note, integration work, event attendance). Do NOT mention revenue or customer counts, and do not resolve or worsen any tension in the existing evidence.",
  cold_start: "A small but real first artifact: a class-project demo, a first prototype video, a first campus test. Modest scale, concrete numbers.",
};
const DEFAULT_STEER =
  "Realistic incremental progress consistent with the existing evidence: a build log, small feature ship, a technical write-up, a pilot datapoint, or a modest launch. Concrete numbers and dates; no leaps beyond what the trajectory supports.";

function widenFactor(c: number) {
  return 1 + 0.5 * (1 - Math.min(1, Math.max(0, c)));
}

function rescaleBand(b: ScoreBand, oldC: number, newC: number): ScoreBand {
  const f = widenFactor(newC) / widenFactor(oldC);
  const clamp = (x: number) => Math.min(100, Math.max(0, Math.round(x * 10) / 10));
  return {
    value: b.value,
    low: clamp(b.value - (b.value - b.low) * f),
    high: clamp(b.value + (b.high - b.value) * f),
    coverage: Math.round(newC * 100) / 100,
  };
}

async function enrichOne(founderId: string, name: string) {
  const bundle = await assembleBundle(founderId);
  if (bundle.signals.length >= 3) return console.log(`○ ${name}: already ${bundle.signals.length} signals, skipped`);

  const archetype = (bundle.signals
    .map((s) => (s.meta as Record<string, unknown> | null)?.archetype)
    .find(Boolean) ?? "unknown") as string;
  const latest = bundle.signals.reduce<Date | null>(
    (acc, s) => (s.occurredAt && (!acc || s.occurredAt > acc) ? s.occurredAt : acc),
    null
  ) ?? new Date("2026-06-15");

  const gen = await runLLM({
    step: "enrich_signal",
    model: MODELS.score,
    system:
      "You write realistic follow-up evidence signals for founder profiles in a test corpus. The signal must read like genuinely scraped/observed content (a commit summary, launch post, blog note, forum post). Never use the words 'synthetic', 'fictional' or 'test'. Never contradict the existing evidence.",
    prompt: `EXISTING EVIDENCE:\n${renderEvidence(bundle)}\n\nSTYLE FOR THIS FOUNDER: ${ARCHETYPE_STEER[archetype] ?? DEFAULT_STEER}\n\nWrite ONE follow-up signal observed ${""}after the latest evidence. Respond with JSON only:\n{"source": "GITHUB"|"BLOG"|"WEB"|"PRODUCT_HUNT"|"HACKER_NEWS"|"DEVPOST", "daysAfterLatest": <3-45>, "rawContent": "<2-5 sentences, concrete>"}`,
    temperature: 0.9,
    schema: generatedSignalSchema,
    inputRefs: { founderId, purpose: "corpus-enrichment" },
  });

  const occurredAt = new Date(latest.getTime() + gen.parsed.daysAfterLatest * 86_400_000);
  const signal = await prisma.signal.create({
    data: {
      founderId,
      source: gen.parsed.source,
      rawContent: gen.parsed.rawContent,
      occurredAt,
      meta: { synthetic: true, enrichment: true, archetype },
    },
  });

  const extraction = await extractClaims({ id: signal.id, source: signal.source, rawContent: signal.rawContent });
  if (extraction.claims.length > 0) {
    await prisma.claim.createMany({
      data: extraction.claims.map((c) => ({
        signalId: signal.id,
        text: c.text,
        category: c.category.toUpperCase() as "TRACTION" | "TEAM" | "MARKET" | "REVENUE" | "PRODUCT" | "TECHNOLOGY" | "OTHER",
        sourceLocation: c.sourceLocation,
        specificity: c.specificity,
      })),
    });
  }

  const scoreRow = await prisma.founderScore.findUniqueOrThrow({ where: { founderId } });
  const before = snapshotFromDb(scoreRow);
  const delta = await deltaUpdate(
    renderBandSummary(before),
    { id: signal.id, source: signal.source, rawContent: signal.rawContent, occurredAt },
    bundle
  );
  if (delta.updates.length > 0) await applyDeltaUpdates(founderId, delta, signal.id);

  // Recalibrate widths to the new deterministic coverage.
  const newBundle = await assembleBundle(founderId);
  const newCoverage = computeCoverage(newBundle);
  const row = await prisma.founderScore.findUniqueOrThrow({ where: { founderId } });
  const dims = Object.fromEntries(
    DIMENSION_KEYS.map((d) => {
      const band = scoreBandSchema.parse(row[d]);
      return [d, rescaleBand(band, band.coverage ?? 0.3, newCoverage)];
    })
  ) as Record<(typeof DIMENSION_KEYS)[number], ScoreBand>;
  const composite = compositeBand(DIMENSION_KEYS.map((d) => dims[d]));
  await prisma.founderScore.update({
    where: { founderId },
    data: { ...dims, composite, capabilityVisibilityGap: Math.round((composite.value - row.visibilityIndex) * 10) / 10 },
  });

  console.log(
    `✓ ${name} [${archetype}]: +${gen.parsed.source} signal, ${extraction.claims.length} claims, ${delta.updates.length} band moves, coverage → ${newCoverage}`
  );
}

async function main() {
  const founders = await prisma.founder.findMany({
    where: { score: { isNot: null } },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  const targets = founders.slice(0, LIMIT === Infinity ? undefined : LIMIT);
  console.log(`Enriching up to ${targets.length} founders (skip if >=3 signals)`);

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((f) => enrichOne(f.id, f.name)));
    for (const r of results) if (r.status === "rejected") console.error("✖ enrichment failed:", r.reason);
  }

  const stats = await prisma.$queryRaw<Array<{ avg: number }>>`SELECT AVG((composite->>'coverage')::float) as avg FROM "FounderScore"`;
  console.log(`\nDone. Mean coverage now: ${Number(stats[0]?.avg ?? 0).toFixed(2)}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
