import assert from "node:assert/strict";
import { test } from "node:test";
import { MODELS, type RunLlmOptions } from "../../lib/llm";
import type { ExtractionOutput } from "../../lib/contracts";
import {
  buildExtractionPrompt,
  claimKey,
  isAdaptionProcessed,
  planSignalClaims,
  validateGroundedClaim,
  type SignalForExtraction,
} from "./claim-extraction";

function signal(overrides: Partial<SignalForExtraction> = {}): SignalForExtraction {
  return {
    id: "signal-1",
    source: "DECK",
    sourceUrl: "synthetic://deck/demo",
    rawContent: "Slide 1:\nWe interviewed 17 warehouse managers.\n\nSlide 2:\nPilot starts in August.",
    meta: {},
    claims: [],
    ...overrides,
  };
}

test("detects supported Adaption metadata shapes", () => {
  assert.equal(isAdaptionProcessed({ adaptionProcessed: true }), true);
  assert.equal(isAdaptionProcessed({ extractionProvider: "adaption" }), true);
  assert.equal(isAdaptionProcessed({ adaption: { processed: true } }), true);
  assert.equal(isAdaptionProcessed({ extractionProvider: "curated-gate-1" }), false);
});

test("prompt requires verbatim evidence and preserves source", () => {
  const prompt = buildExtractionPrompt(signal());
  assert.match(prompt, /MUST be copied verbatim/);
  assert.match(prompt, /We interviewed 17 warehouse managers\./);
  assert.match(prompt, /Do not infer/);
});

test("grounding rejects invented claims and incorrect slide locations", () => {
  const rawContent = signal().rawContent;
  assert.deepEqual(
    validateGroundedClaim(rawContent, {
      text: "We interviewed 70 warehouse managers.",
      category: "traction",
      sourceLocation: "slide 1",
      specificity: "high",
    }),
    { accepted: false, reason: "claim is not a verbatim source substring" },
  );
  assert.deepEqual(
    validateGroundedClaim(rawContent, {
      text: "Pilot starts in August.",
      category: "product",
      sourceLocation: "slide 1",
      specificity: "high",
    }),
    { accepted: false, reason: "source location does not match slide 2" },
  );
});

test("planner uses the frozen runLLM boundary and removes unsupported duplicates", async () => {
  const received: RunLlmOptions<ExtractionOutput>[] = [];
  const input = signal({
    claims: [{ text: "Pilot starts in August.", sourceLocation: "slide 2" }],
  });
  const plan = await planSignalClaims(input, async (options) => {
    received.push(options);
    return {
      text: "fixture",
      parsed: {
        claims: [
          {
            text: "We interviewed 17 warehouse managers.",
            category: "traction",
            sourceLocation: "slide 1",
            specificity: "high",
          },
          {
            text: "We interviewed 17 warehouse managers.",
            category: "traction",
            sourceLocation: "slide 1",
            specificity: "high",
          },
          {
            text: "Pilot starts in August.",
            category: "product",
            sourceLocation: "slide 2",
            specificity: "high",
          },
          {
            text: "Revenue is $1M.",
            category: "revenue",
            sourceLocation: "slide 2",
            specificity: "high",
          },
        ],
      },
      cached: false,
      model: MODELS.extract,
    };
  });

  assert.equal(received.length, 1);
  assert.equal(received[0].step, "extract_claims");
  assert.equal(received[0].model, MODELS.extract);
  assert.deepEqual(received[0].inputRefs, { signalId: "signal-1" });
  assert.equal(received[0].noCache, undefined);
  assert.equal(plan.accepted.length, 1);
  assert.equal(plan.rejected.length, 3);
});

test("planner refuses Adaption-processed signals before calling the model", async () => {
  let called = false;
  await assert.rejects(
    planSignalClaims(signal({ meta: { adaptionProcessed: true } }), async () => {
      called = true;
      throw new Error("should not run");
    }),
    /already processed by Adaption/,
  );
  assert.equal(called, false);
});

test("claim keys normalize harmless whitespace and case", () => {
  assert.equal(
    claimKey({ text: "  Pilot   starts in August. ", sourceLocation: "Slide 2" }),
    claimKey({ text: "pilot starts in august.", sourceLocation: "slide 2" }),
  );
});
