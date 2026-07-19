import assert from "node:assert/strict";
import test from "node:test";
import { loadCorpus, validateCorpus } from "./corpus-schema";

function clone<T>(value: T): T {
  return structuredClone(value);
}

test("the canonical corpus satisfies all Gate 1 invariants", async () => {
  const input = await loadCorpus();
  const { summary } = validateCorpus(input);

  assert.equal(summary.profiles, 36);
  assert.equal(summary.decks, 10);
  assert.equal(summary.contradictionCases, 4);
});

test("rejects an unexpected score owned by Track B", async () => {
  const input = await loadCorpus();
  const invalid = clone(input) as Array<Record<string, unknown>>;
  invalid[0].founderScore = { composite: 90 };

  assert.throws(() => validateCorpus(invalid), /unrecognized key/i);
});

test("rejects duplicate ingestion keys", async () => {
  const input = await loadCorpus();
  const invalid = clone(input) as Array<{ signals: Array<{ meta: { ingestionKey: string } }> }>;
  invalid[1].signals[0].meta.ingestionKey = invalid[0].signals[0].meta.ingestionKey;

  assert.throws(() => validateCorpus(invalid), /Duplicate ingestion keys/);
});

test("rejects a contradiction without counter evidence", async () => {
  const input = await loadCorpus();
  const invalid = clone(input) as Array<{
    signals: Array<{ contradiction?: { caseId: string; role: string } }>;
  }>;
  for (const profile of invalid) {
    profile.signals = profile.signals.filter(
      (signal) =>
        signal.contradiction?.caseId !== "contradiction-01" ||
        signal.contradiction.role !== "counter_evidence",
    );
  }

  assert.throws(() => validateCorpus(invalid), /must contain assertion and counter_evidence/);
});

test("rejects a deck without slide markers", async () => {
  const input = await loadCorpus();
  const invalid = clone(input) as Array<{ signals: Array<{ source: string; rawContent: string }> }>;
  const deck = invalid.flatMap((profile) => profile.signals).find((signal) => signal.source === "DECK");
  assert.ok(deck);
  deck.rawContent = "A synthetic deck body with enough content but without location markers.";

  assert.throws(() => validateCorpus(invalid), /has no slide markers/);
});
