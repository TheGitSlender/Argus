/**
 * Full-pipeline smoke test (~28 LLM calls) + ambition-read contrast on the
 * hype-case founder. Run: npm run test:pipeline
 */
import { runOpportunityPipeline } from "../lib/intel/pipeline";
import { readAmbition } from "../lib/intel/stages";
import { amara, maxwell } from "./fixtures";

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
  console.log("=== FULL PIPELINE: Amara (hidden gem) ===");
  const result = await runOpportunityPipeline(amara, {
    thesis,
    firstSignalAt: new Date("2026-07-15T09:00:00Z"),
  });

  console.log("\nscreen:", result.screen.verdict);
  console.log("\ncomposite:", JSON.stringify(result.founderScore?.snapshot.composite));
  console.log("gap:", result.founderScore?.snapshot.capabilityVisibilityGap);
  console.log("\nambition read:");
  console.log(JSON.stringify(result.ambition, null, 2));
  console.log("\naxes:", Object.entries(result.axes ?? {}).map(([k, v]) => `${k}=${v.value}(${v.trend})`).join(" "));
  console.log("validations:", result.validations.map((v) => `${v.claimId}:${v.result.verificationStatus}(${v.result.trustScore})`).join(" "));
  console.log("playbook questions:", result.playbook?.questions.length);
  console.log("\nmemo decision:", result.memo?.decision, "-", result.memo?.decisionRationale);
  console.log("memo gaps:", result.memo?.gaps);
  console.log("signal->decision hours:", result.memo?.signalToDecisionHours);

  console.log("\n=== AMBITION CONTRAST: Maxwell (hype case) ===");
  const mx = await readAmbition(maxwell);
  console.log(JSON.stringify(mx, null, 2));

  console.log("\nPIPELINE TEST COMPLETE ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
