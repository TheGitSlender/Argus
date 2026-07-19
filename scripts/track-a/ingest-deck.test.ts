import assert from "node:assert/strict";
import { test } from "node:test";
import { SignalSource } from "@prisma/client";
import { assertDeckSignalMatch, extractedDeckSchema } from "./ingest-deck";

const validDeck = {
  schemaVersion: "track-a.deck-text.v1",
  sourceFile: "demo.pdf",
  sourceSha256: "a".repeat(64),
  pageCount: 2,
  emptySlides: [2],
  pages: [
    { slide: 1, text: "Problem evidence" },
    { slide: 2, text: "" },
  ],
  text: "Slide 1:\nProblem evidence\n\nSlide 2:",
};

test("accepts the canonical local deck extraction contract", () => {
  assert.deepEqual(extractedDeckSchema.parse(validDeck), validDeck);
});

test("rejects inconsistent page text, numbering, and empty-page metadata", () => {
  assert.equal(extractedDeckSchema.safeParse({ ...validDeck, text: "changed" }).success, false);
  assert.equal(
    extractedDeckSchema.safeParse({ ...validDeck, pages: [{ slide: 2, text: "Problem evidence" }] }).success,
    false,
  );
  assert.equal(extractedDeckSchema.safeParse({ ...validDeck, emptySlides: [] }).success, false);
});

test("allows exact idempotent deck-signal reuse", () => {
  assert.doesNotThrow(() =>
    assertDeckSignalMatch(
      {
        founderId: "founder-1",
        opportunityId: "opportunity-1",
        source: SignalSource.DECK,
        sourceUrl: "synthetic://deck/upload-1",
        rawContent: validDeck.text,
        meta: { sourceSha256: validDeck.sourceSha256 },
      },
      {
        founderId: "founder-1",
        opportunityId: "opportunity-1",
        sourceUrl: "synthetic://deck/upload-1",
        rawContent: validDeck.text,
        sourceSha256: validDeck.sourceSha256,
      },
    ),
  );
});

test("rejects canonical URL collisions with changed deck evidence", () => {
  assert.throws(
    () =>
      assertDeckSignalMatch(
        {
          founderId: null,
          opportunityId: null,
          source: SignalSource.DECK,
          sourceUrl: "synthetic://deck/upload-1",
          rawContent: "changed",
          meta: { sourceSha256: validDeck.sourceSha256 },
        },
        {
          founderId: null,
          opportunityId: null,
          sourceUrl: "synthetic://deck/upload-1",
          rawContent: validDeck.text,
          sourceSha256: validDeck.sourceSha256,
        },
      ),
    /Signal collision/,
  );
});
