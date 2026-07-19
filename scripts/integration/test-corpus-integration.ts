/**
 * Track A corpus -> Track B intelligence integration test.
 * Part 1 is free & deterministic (conversion + visibility index per archetype).
 * Part 2 makes ~4 live LLM calls (screen + ambition on one hidden gem, one hype).
 * Run: npx tsx --env-file=.env scripts/integration/test-corpus-integration.ts
 */
import { loadCorpus, validateCorpus } from "../track-a/corpus-schema";
import { profileToBundle } from "./corpus-bundle";
import { computeCoverage } from "../../lib/intel/evidence";
import { computeVisibilityIndex, deriveVisibilityInputs } from "../../lib/intel/visibility";
import { readAmbition, screenApplication } from "../../lib/intel/stages";

async function main() {
  const { profiles, summary } = validateCorpus(await loadCorpus());
  console.log(`corpus valid: ${summary.profiles} profiles, ${summary.signals} signals, ${summary.claims} claims`);

  const bundles = profiles.map((p) => ({ archetype: p.archetype, profile: p, bundle: profileToBundle(p) }));
  console.log(`converted ${bundles.length} profiles -> EvidenceBundle without error`);

  // Deterministic: visibility index + coverage by archetype.
  const byArchetype = new Map<string, number[]>();
  const coverages: number[] = [];
  for (const { archetype, bundle } of bundles) {
    const vis = computeVisibilityIndex(deriveVisibilityInputs(bundle));
    (byArchetype.get(archetype) ?? byArchetype.set(archetype, []).get(archetype)!).push(vis);
    coverages.push(computeCoverage(bundle));
  }
  console.log("\nvisibility index by archetype (avg [min-max]) — hype MUST be far above hidden_gem:");
  for (const [arch, vals] of byArchetype) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    console.log(`  ${arch.padEnd(13)} ${avg.toFixed(1).padStart(5)}  [${Math.min(...vals).toFixed(1)}-${Math.max(...vals).toFixed(1)}]`);
  }
  console.log(`coverage range across corpus: ${Math.min(...coverages)}-${Math.max(...coverages)}`);

  // Live spot check on two contrasting profiles.
  const gem = bundles.find((b) => b.archetype === "hidden_gem")!;
  const hype = bundles.find((b) => b.archetype === "hype")!;
  console.log(`\nlive spot check: ${gem.profile.founder.name} (hidden_gem) vs ${hype.profile.founder.name} (hype)`);

  const [gemScreen, hypeScreen, gemAmbition, hypeAmbition] = await Promise.all([
    screenApplication(gem.bundle),
    screenApplication(hype.bundle),
    readAmbition(gem.bundle),
    readAmbition(hype.bundle),
  ]);

  console.log(`  gem  screen=${gemScreen.verdict} | ambition=${gemAmbition.ambitionLevel} hype=${gemAmbition.hypeRisk} verdict=${gemAmbition.ideaAgnosticVerdict}`);
  console.log(`  hype screen=${hypeScreen.verdict} | ambition=${hypeAmbition.ambitionLevel} hype=${hypeAmbition.hypeRisk} verdict=${hypeAmbition.ideaAgnosticVerdict}`);

  console.log("\nINTEGRATION TEST COMPLETE ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
