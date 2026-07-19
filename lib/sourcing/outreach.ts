// Outreach message generation and reason generation for sourced founders.
// Uses the LLM via runLLM to produce personalized content.

import { runLLM } from "@/lib/llm";
import {
  REASON_SYSTEM,
  reasonPrompt,
  OUTREACH_SYSTEM,
  outreachPrompt,
} from "@/lib/intel/prompts";
import type { RankedFounder, FounderWithScore } from "./rank";
import { signalSummary } from "./rank";

/**
 * Generate a one-liner explaining why a founder is interesting.
 * Uses the cheap extract model.
 */
export async function generateReason(founder: RankedFounder, thesisSectors: string[]): Promise<string> {
  const signals = signalSummary(founder);

  const result = await runLLM({
    step: "sourcing_reason",
    model: undefined, // defaults to extract model
    system: REASON_SYSTEM,
    prompt: reasonPrompt(founder.name, founder.company, signals, thesisSectors),
    inputRefs: { founderId: founder.founderId, opportunityId: founder.opportunityId },
  });

  return result.parsed.trim();
}

/**
 * Generate a personalized outreach message for a founder.
 * Uses the cheap extract model.
 */
export async function generateOutreachDraft(
  founder: FounderWithScore,
  thesisSectors: string[],
): Promise<string> {
  const signals = signalSummary(founder);

  const result = await runLLM({
    step: "sourcing_outreach",
    model: undefined, // defaults to extract model
    system: OUTREACH_SYSTEM,
    prompt: outreachPrompt(founder.name, founder.company, signals, thesisSectors),
    inputRefs: { founderId: founder.founderId, opportunityId: founder.opportunityId },
  });

  return result.parsed.trim();
}
