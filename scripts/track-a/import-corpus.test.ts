import assert from "node:assert/strict";
import test from "node:test";
import { ClaimCategory, SignalSource } from "@prisma/client";
import { loadCorpus, validateCorpus } from "./corpus-schema";
import {
  assertIdentityOwner,
  assertSignalMatch,
  corpusImportTotals,
  toPrismaClaimCategory,
  toSignalMeta,
} from "./import-corpus";

test("computes the canonical import totals", async () => {
  const { profiles } = validateCorpus(await loadCorpus());
  assert.deepEqual(corpusImportTotals(profiles), {
    founders: 36,
    companies: 36,
    opportunities: 36,
    opportunityFounders: 36,
    identities: 30,
    signals: 40,
    claims: 54,
  });
});

test("maps every corpus claim category to Prisma", () => {
  assert.equal(toPrismaClaimCategory("traction"), ClaimCategory.TRACTION);
  assert.equal(toPrismaClaimCategory("team"), ClaimCategory.TEAM);
  assert.equal(toPrismaClaimCategory("market"), ClaimCategory.MARKET);
  assert.equal(toPrismaClaimCategory("revenue"), ClaimCategory.REVENUE);
  assert.equal(toPrismaClaimCategory("product"), ClaimCategory.PRODUCT);
  assert.equal(toPrismaClaimCategory("technology"), ClaimCategory.TECHNOLOGY);
  assert.equal(toPrismaClaimCategory("other"), ClaimCategory.OTHER);
});

test("adds stable corpus provenance to Signal.meta", async () => {
  const { profiles } = validateCorpus(await loadCorpus());
  const profile = profiles.find((candidate) => candidate.profileId === "syn-021");
  assert.ok(profile);
  const signal = profile.signals[0];
  const meta = toSignalMeta(profile, signal);

  assert.equal(meta.synthetic, true);
  assert.equal(meta.profileId, "syn-021");
  assert.equal(meta.corpusVersion, "1.0.0");
  assert.deepEqual(meta.contradiction, { caseId: "contradiction-01", role: "assertion" });
});

test("rejects identity reassignment", () => {
  assert.throws(
    () =>
      assertIdentityOwner(
        { founderId: "founder-a", source: SignalSource.GITHUB, handle: "same-handle" },
        "founder-b",
      ),
    /Identity collision/,
  );
});

test("rejects changed evidence at an existing canonical signal URL", () => {
  const occurredAt = new Date("2026-01-01T00:00:00.000Z");
  assert.throws(
    () =>
      assertSignalMatch(
        {
          founderId: "founder-a",
          opportunityId: "opportunity-a",
          rawContent: "old evidence",
          occurredAt,
          sourceUrl: "synthetic://signal",
        },
        {
          founderId: "founder-a",
          opportunityId: "opportunity-a",
          rawContent: "changed evidence",
          occurredAt,
          sourceUrl: "synthetic://signal",
        },
      ),
    /Signal collision/,
  );
});
