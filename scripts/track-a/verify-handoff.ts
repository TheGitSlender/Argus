import assert from "node:assert/strict";
import { Prisma, PrismaClient, SignalSource } from "@prisma/client";
import { loadCorpus, type SyntheticProfile, validateCorpus } from "./corpus-schema";

export const DEMO_PROFILE_IDS = {
  hiddenGem: "syn-003",
  coldStart: "syn-015",
  contradiction: "syn-021",
  persistentIdentity: "syn-001",
} as const;

type DemoKey = keyof typeof DEMO_PROFILE_IDS;

const EXPECTED_ARCHETYPES: Record<DemoKey, SyntheticProfile["archetype"]> = {
  hiddenGem: "hidden_gem",
  coldStart: "cold_start",
  contradiction: "contradiction",
  persistentIdentity: "hidden_gem",
};

export function requiredDemoProfiles(profiles: SyntheticProfile[]): Record<DemoKey, SyntheticProfile> {
  return Object.fromEntries(
    Object.entries(DEMO_PROFILE_IDS).map(([key, profileId]) => {
      const profile = profiles.find((candidate) => candidate.profileId === profileId);
      assert(profile, `Missing Gate 5 demo profile ${profileId}`);
      assert.equal(
        profile.archetype,
        EXPECTED_ARCHETYPES[key as DemoKey],
        `Unexpected archetype for ${profileId}`,
      );
      return [key, profile];
    }),
  ) as Record<DemoKey, SyntheticProfile>;
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), "Expected JSON object");
  return value as Record<string, Prisma.JsonValue>;
}

function sorted(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

async function founderEvidence(prisma: PrismaClient, profile: SyntheticProfile) {
  const founder = await prisma.founder.findUnique({
    where: { email: profile.founder.email },
    include: {
      identities: true,
      signals: { include: { claims: true }, orderBy: { sourceUrl: "asc" } },
      opportunities: { include: { opportunity: { include: { company: true } } } },
    },
  });
  assert(founder, `Founder missing after rebuild: ${profile.founder.email}`);
  assert.equal(founder.name, profile.founder.name);
  assert(
    founder.opportunities.some((link) => link.opportunity.company.name === profile.company.name),
    `Opportunity link missing for ${profile.profileId}`,
  );
  return founder;
}

async function verifyHiddenGem(prisma: PrismaClient, profile: SyntheticProfile) {
  const founder = await founderEvidence(prisma, profile);
  const context = jsonObject(founder.context);
  assert.equal(context.priorFunding, profile.founder.context.priorFunding);
  assert(founder.signals.length >= 1, "Hidden-gem case requires evidence");
  assert(founder.signals.every((signal) => signal.claims.length > 0), "Hidden-gem Signals require Claims");
  assert(
    founder.signals.every((signal) => jsonObject(signal.meta).visibilityOnly === false),
    "Hidden-gem evidence must not be visibility-only",
  );
  return {
    profileId: profile.profileId,
    founderId: founder.id,
    founder: founder.name,
    company: profile.company.name,
    priorFunding: context.priorFunding,
    signalCount: founder.signals.length,
    claimCount: founder.signals.reduce((total, signal) => total + signal.claims.length, 0),
    evidenceKinds: sorted(founder.signals.map((signal) => String(jsonObject(signal.meta).evidenceKind))),
  };
}

async function verifyColdStart(prisma: PrismaClient, profile: SyntheticProfile) {
  const founder = await founderEvidence(prisma, profile);
  assert.equal(founder.signals.length, 1, "Cold-start case must remain deck-only");
  const [signal] = founder.signals;
  assert.equal(signal.source, SignalSource.DECK);
  assert.match(signal.rawContent, /^Slide 1:/);
  assert(signal.claims.length > 0, "Cold-start deck requires extracted reference Claims");
  return {
    profileId: profile.profileId,
    founderId: founder.id,
    founder: founder.name,
    company: profile.company.name,
    source: signal.source,
    signalCount: founder.signals.length,
    claimCount: signal.claims.length,
    slideMarkers: (signal.rawContent.match(/^Slide\s+\d+:/gm) ?? []).length,
  };
}

async function verifyContradiction(prisma: PrismaClient, profile: SyntheticProfile) {
  const founder = await founderEvidence(prisma, profile);
  assert.equal(founder.signals.length, 2, "Contradiction case requires exactly two source sides");
  const contradictionMeta = founder.signals.map((signal) => jsonObject(jsonObject(signal.meta).contradiction ?? null));
  const caseIds = new Set(contradictionMeta.map((meta) => String(meta.caseId)));
  const roles = sorted(contradictionMeta.map((meta) => String(meta.role)));
  assert.equal(caseIds.size, 1, "Contradiction source sides must share one caseId");
  assert.deepEqual(roles, ["assertion", "counter_evidence"]);
  assert(founder.signals.every((signal) => signal.claims.length > 0), "Both contradiction sides require Claims");
  return {
    profileId: profile.profileId,
    founderId: founder.id,
    founder: founder.name,
    company: profile.company.name,
    caseId: [...caseIds][0],
    roles,
    signalIds: founder.signals.map((signal) => signal.id),
    claimCount: founder.signals.reduce((total, signal) => total + signal.claims.length, 0),
  };
}

async function verifyPersistentIdentity(prisma: PrismaClient, profile: SyntheticProfile) {
  const founder = await founderEvidence(prisma, profile);
  const identitySources = sorted(founder.identities.map((identity) => identity.source));
  assert(identitySources.includes(SignalSource.GITHUB), "Original GitHub identity missing");
  assert(identitySources.includes(SignalSource.BLOG), "Resolved Blog identity missing");
  const blogIdentity = founder.identities.find((identity) => identity.source === SignalSource.BLOG);
  assert.equal(blogIdentity?.handle, "amina-field-notes");
  assert.equal(blogIdentity?.matchConfidence, 1);
  return {
    profileId: profile.profileId,
    founderId: founder.id,
    founder: founder.name,
    company: profile.company.name,
    opportunityCount: founder.opportunities.length,
    identities: founder.identities
      .map((identity) => ({
        source: identity.source,
        handle: identity.handle,
        confidence: identity.matchConfidence,
      }))
      .sort((left, right) => left.source.localeCompare(right.source)),
  };
}

async function main() {
  const { profiles } = validateCorpus(await loadCorpus());
  const demos = requiredDemoProfiles(profiles);
  const prisma = new PrismaClient();
  try {
    const scoreHistoryBefore = await prisma.scoreHistory.count();
    const reasoningLogBefore = await prisma.reasoningLog.count();
    const report = {
      schemaVersion: "track-a.handoff-verification.v1",
      hiddenGem: await verifyHiddenGem(prisma, demos.hiddenGem),
      coldStart: await verifyColdStart(prisma, demos.coldStart),
      contradiction: await verifyContradiction(prisma, demos.contradiction),
      persistentIdentity: await verifyPersistentIdentity(prisma, demos.persistentIdentity),
      databaseCounts: {
        founders: await prisma.founder.count(),
        companies: await prisma.company.count(),
        opportunities: await prisma.opportunity.count(),
        identities: await prisma.identity.count(),
        signals: await prisma.signal.count(),
        claims: await prisma.claim.count(),
        scoreHistory: await prisma.scoreHistory.count(),
        reasoningLogs: await prisma.reasoningLog.count(),
      },
    };
    assert.equal(report.databaseCounts.scoreHistory, scoreHistoryBefore, "Verifier changed ScoreHistory");
    assert.equal(report.databaseCounts.reasoningLogs, reasoningLogBefore, "Verifier changed ReasoningLog");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("verify-handoff.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
