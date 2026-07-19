/**
 * Memo-stage smoke test (~2 heavy LLM calls). Reuses hardcoded upstream outputs
 * from a prior test:intel run so we only exercise the adversarial + memo stages.
 * Run: npx tsx --env-file=.env scripts/test-memo.ts
 */
import { generateMemo } from "../lib/intel/memo";
import type { InterviewPlaybook } from "../lib/contracts";

import { amara } from "./fixtures";

const bandSummary = `- Execution: 74 [69-79] (coverage 0.46) — width 10
- Technical Depth: 76 [71-81] (coverage 0.46) — width 10
- Problem Insight: 70 [64-74] (coverage 0.46) — width 10
- Resourcefulness: 78 [74-82] (coverage 0.46) — width 8
- Momentum: 70 [66-74] (coverage 0.46) — width 8
- Composite: 73.6 [69.3-77.4] (coverage 0.46)
- Visibility Index: 16.4 | capability-visibility gap: 57.2`;

const axes = {
  founder: { value: 75, trend: "stable" as const, rationale: "Strong technical depth and sustained solo execution; deployment lightly verified.", citedClaimIds: ["clm-1", "clm-2"] },
  market: { value: 65, trend: "improving" as const, rationale: "Warehouse automation growing; moderate competitive density; niche wedge plausible.", citedClaimIds: [] },
  idea_vs_market: { value: 65, trend: "stable" as const, rationale: "Idea survives scrutiny; domain insider with pivot capacity if wedge stalls.", citedClaimIds: ["clm-1"] },
};

const playbook: InterviewPlaybook = {
  questions: [
    {
      targetDimension: "problemInsight",
      question: "Walk me through how you identified reflective packaging as the core failure mode — and how you know it generalizes beyond your two pilots.",
      strongAnswerSignature: "Systematic error analysis plus external validation from other warehouse operators.",
      redFlagSignature: "Only anecdotes from their own workplace.",
      expectedBandReduction: "resolves Problem Insight band from ±10 to ~±4",
    },
    {
      targetDimension: "momentum",
      question: "What is the nature of the two pilot deployments — production, trial, or demo? What metrics do they track?",
      strongAnswerSignature: "Live usage data, feedback loops, iteration driven by pilot results.",
      redFlagSignature: "Superficial one-off demos with no measured outcomes.",
      expectedBandReduction: "resolves Momentum band from ±8 to ~±3",
    },
  ],
};

const thesis = {
  name: "Maschmeyer AI Seed Thesis",
  sectors: ["ai-infra", "devtools", "applied-ai"],
  stages: ["pre-seed", "seed"],
  geographies: ["Europe", "North America"],
  checkSizeUsd: 100_000,
  ownershipTargetPct: 7,
  riskAppetite: "aggressive" as const,
};

async function main() {
  const { memo } = await generateMemo({
    bundle: amara,
    bandSummary,
    axes,
    playbook,
    thesis,
    firstSignalAt: new Date("2026-07-15T09:00:00Z"),
  });

  console.log("=== DECISION:", memo.decision.toUpperCase(), "===");
  console.log("rationale:", memo.decisionRationale);
  console.log("thesis fit:", memo.thesisFit);
  console.log("signal->decision hours:", memo.signalToDecisionHours);
  console.log("\n--- GAPS ---");
  memo.gaps.forEach((g) => console.log("-", g));
  console.log("\n--- COMPANY SNAPSHOT ---\n" + memo.companySnapshot);
  console.log("\n--- INVESTMENT HYPOTHESES ---\n" + memo.investmentHypotheses);
  console.log("\n--- SWOT ---\n" + memo.swot);
  console.log("\n--- TRACTION & KPIS ---\n" + memo.tractionAndKpis);
  console.log("\n--- BEAR CASE ---\n" + memo.bearCase);
  console.log("\nMEMO TEST COMPLETE ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
