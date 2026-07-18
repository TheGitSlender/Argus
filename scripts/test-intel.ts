/**
 * Intelligence-layer smoke test. No DB required (llm.ts fail-softs the log).
 * Run: npm run test:intel   (~20 LLM calls, well under $0.10)
 *
 * Exercises: screen -> founder score (bands via self-consistency) -> 3 axes ->
 * validator on the seeded contradiction -> interview playbook -> delta update.
 */
import type { EvidenceBundle } from "../lib/intel/evidence";
import { screenApplication, scoreAxis, validateClaim, generatePlaybook, deltaUpdate } from "../lib/intel/stages";
import { scoreFounder, renderBandSummary } from "../lib/intel/founder-score";

const amara: EvidenceBundle = {
  founder: {
    id: "amara-test",
    name: "Amara Diallo",
    context: {
      teamStatus: "solo",
      occupation: "employed",
      priorFunding: "none known",
      location: "Berlin",
      notes: "Warehouse ops engineer building CV tooling nights/weekends.",
    },
  },
  signals: [
    {
      id: "sig-gh-1",
      source: "GITHUB",
      sourceUrl: "https://github.com/amaradiallo/warehouse-cv",
      rawContent:
        "Repo warehouse-cv: 14 months of consistent commits, custom detection head replacing YOLO in March with benchmarked tradeoffs, deployed at 2 pilot warehouses. 11 stars.",
      occurredAt: new Date("2026-06-20"),
      meta: { stars: 11, followers: 40, commitCadence: "steady", finishedProjects: 3 },
    },
    {
      id: "sig-blog-1",
      source: "BLOG",
      rawContent:
        "Technical blog post: 'Why we measured 22% better recall after replacing YOLO' — walks through the failure modes on reflective packaging and the custom head design.",
      occurredAt: new Date("2026-05-02"),
    },
  ],
  claims: [
    {
      id: "clm-1",
      text: "Custom detection head outperforms YOLO baseline by 22% on their warehouse dataset",
      category: "technology",
      sourceLocation: "README benchmarks",
      specificity: "high",
      verificationStatus: "VERIFIED",
      trustScore: 0.8,
    },
    {
      id: "clm-2",
      text: "Deployed at 2 pilot warehouses since April",
      category: "traction",
      sourceLocation: "README",
      specificity: "medium",
      verificationStatus: "UNVERIFIED",
      trustScore: 0.55,
    },
  ],
};

const priya: EvidenceBundle = {
  founder: {
    id: "priya-test",
    name: "Priya Raghavan",
    context: { teamStatus: "cofounders", occupation: "full_time_founder", priorFunding: "none known", location: "London" },
  },
  signals: [
    {
      id: "sig-deck-1",
      source: "DECK",
      rawContent: "Pitch deck: ShipMetrics, logistics analytics. Slide 9 claims $40K MRR and 30 enterprise customers.",
      occurredAt: new Date("2026-07-10"),
    },
    {
      id: "sig-ph-1",
      source: "PRODUCT_HUNT",
      sourceUrl: "https://producthunt.com/posts/shipmetrics",
      rawContent: "Product Hunt launch post dated 2026-06-27: 'Today we're launching ShipMetrics into public beta!'",
      occurredAt: new Date("2026-06-27"),
    },
  ],
  claims: [
    {
      id: "clm-mrr",
      text: "$40K MRR with 30 enterprise customers",
      category: "revenue",
      sourceLocation: "slide 9",
      specificity: "high",
      verificationStatus: "UNVERIFIED",
    },
  ],
};

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
