/**
 * Synthetic-timeline simulation: spread opportunity ages over ~6 weeks
 * (recent-skewed), vary funnel statuses, and give DECIDED deals realistic
 * signal->decision times (mostly under 24h — the brief's benchmark).
 * Deterministic via seeded PRNG so re-runs are stable.
 * Usage: npx tsx --env-file=.env scripts/simulate-timeline.ts
 */
import { prisma } from "../lib/db";

let seed = 424242;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

async function main() {
  const opportunities = await prisma.opportunity.findMany({
    include: { company: true, founders: { include: { founder: true } } },
    orderBy: { createdAt: "asc" },
  });
  const now = Date.now();
  const counts: Record<string, number> = {};

  for (const opp of opportunities) {
    const daysAgo = Math.floor(Math.pow(rand(), 1.4) * 42); // 0-42, recent-skewed
    const createdAt = new Date(now - daysAgo * DAY - Math.floor(rand() * 20) * HOUR);
    const firstSignalAt = createdAt;

    const roll = rand();
    let data: Record<string, unknown>;
    if (opp.memo !== null && roll < 0.7) {
      // Decided: mostly <24h, a few slower outliers.
      const hours = rand() < 0.85 ? 5 + rand() * 18 : 24 + rand() * 16;
      data = {
        createdAt,
        firstSignalAt,
        status: "DECIDED",
        decidedAt: new Date(firstSignalAt.getTime() + hours * HOUR),
      };
    } else if (roll < 0.9) {
      data = { createdAt, firstSignalAt, status: "DILIGENCE", decision: null, decidedAt: null };
    } else {
      data = { createdAt, firstSignalAt, status: "SCREENED", decision: null, decidedAt: null };
    }
    await prisma.opportunity.update({ where: { id: opp.id }, data });
    const status = data.status as string;
    counts[status] = (counts[status] ?? 0) + 1;
    console.log(
      `${(opp.founders[0]?.founder.name ?? "?").padEnd(20)} ${opp.company.name.padEnd(22)} ${String(daysAgo).padStart(2)}d ago  ${status}`
    );
  }

  console.log("\nstatus distribution:", counts);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
