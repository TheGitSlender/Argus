/**
 * Intelligence-layer smoke test. No DB required (llm.ts fail-softs the log).
 * Run: npm run test:intel   (~20 LLM calls, well under $0.10)
 *
 * Exercises: screen -> founder score (bands via self-consistency) -> 3 axes ->
 * validator on the seeded contradiction -> interview playbook -> delta update.
 */
import { screenApplication, scoreAxis, validateClaim, generatePlaybook, deltaUpdate } from "../lib/intel/stages";
import { scoreFounder, renderBandSummary } from "../lib/intel/founder-score";
import { amara, priya } from "./fixtures";

const hr = (title: string) => console.log(`\n${"=".repeat(70)}\n${title}\n${"=".repeat(70)}`);

async function main() {
  hr("1. FIRST-PASS SCREEN (Amara)");
  console.log(await screenApplication(amara));

  hr("2. FOUNDER SCORE — 5 dims × 3 samples → bands (Amara)");
  const scored = await scoreFounder(amara);
  console.log(`evidence coverage: ${scored.coverage}`);
  console.log(renderBandSummary(scored.snapshot));
  console.log(`\nsample spread (execution): ${scored.dimensions.execution.samples.map((s) => s.score).join(", ")}`);
  console.log(`execution rationale [0]: ${scored.dimensions.execution.samples[0].rationale}`);

  hr("3. 3-AXIS SCORING (Amara / WarehouseCV)");
  const summary = renderBandSummary(scored.snapshot);
  const [f, m, i] = await Promise.all([
    scoreAxis("founder", amara, { founderScoreSummary: summary }),
    scoreAxis("market", amara),
    scoreAxis("idea_vs_market", amara),
  ]);
  console.log("FOUNDER      :", f.value, f.trend, "-", f.rationale);
  console.log("MARKET       :", m.value, m.trend, "-", m.rationale);
  console.log("IDEA_VS_MKT  :", i.value, i.trend, "-", i.rationale);

  hr("4. VALIDATOR — seeded contradiction (Priya's $40K MRR)");
  const validation = await validateClaim(priya.claims[0], priya);
  console.log(validation);

  hr("5. INTERVIEW PLAYBOOK (Amara)");
  const playbook = await generatePlaybook(summary, amara);
  for (const q of playbook.questions) {
    console.log(`\n[${q.targetDimension}] ${q.question}`);
    console.log(`  strong: ${q.strongAnswerSignature}`);
    console.log(`  redflag: ${q.redFlagSignature}`);
    console.log(`  expected: ${q.expectedBandReduction}`);
  }

  hr("6. DELTA UPDATE — new signal ingested, bands should move/narrow");
  const delta = await deltaUpdate(
    summary,
    {
      id: "sig-new-1",
      source: "WEB",
      rawContent:
        "Third pilot warehouse signed a paid contract (€1.2K/month). v2 of the detection pipeline shipped with 40ms faster inference; changelog and invoice screenshot verified.",
      occurredAt: new Date("2026-07-18"),
    },
    amara
  );
  for (const u of delta.updates) {
    console.log(`${u.dimension}: -> ${u.newBand.value} [${u.newBand.low}-${u.newBand.high}] — ${u.rationale}`);
  }

  console.log("\nSMOKE TEST COMPLETE ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
