import {
  ClaimCategory,
  Prisma,
  PrismaClient,
  SignalSource,
  Track,
} from "@prisma/client";
import { loadCorpus, type SyntheticProfile, validateCorpus } from "./corpus-schema";

export const IMPORT_ENTITY_KEYS = [
  "founders",
  "companies",
  "opportunities",
  "opportunityFounders",
  "identities",
  "signals",
  "claims",
] as const;

type ImportEntityKey = (typeof IMPORT_ENTITY_KEYS)[number];
type ImportCounts = Record<ImportEntityKey, number>;

export interface ImportReport {
  mode: "dry-run" | "apply";
  corpus: ImportCounts;
  created: ImportCounts;
  reused: ImportCounts;
  protectedRows: {
    scoreHistoryBefore: number;
    scoreHistoryAfter: number;
    reasoningLogBefore: number;
    reasoningLogAfter: number;
  };
}

function emptyCounts(): ImportCounts {
  return Object.fromEntries(IMPORT_ENTITY_KEYS.map((key) => [key, 0])) as ImportCounts;
}

export function corpusImportTotals(profiles: SyntheticProfile[]): ImportCounts {
  const counts = emptyCounts();
  counts.founders = profiles.length;
  counts.companies = profiles.length;
  counts.opportunities = profiles.length;
  counts.opportunityFounders = profiles.length;
  counts.identities = profiles.reduce((total, profile) => total + profile.identities.length, 0);
  counts.signals = profiles.reduce((total, profile) => total + profile.signals.length, 0);
  counts.claims = profiles.reduce(
    (total, profile) =>
      total + profile.signals.reduce((signalTotal, signal) => signalTotal + signal.referenceClaims.length, 0),
    0,
  );
  return counts;
}

const CLAIM_CATEGORY_MAP: Record<SyntheticProfile["signals"][number]["referenceClaims"][number]["category"], ClaimCategory> = {
  traction: ClaimCategory.TRACTION,
  team: ClaimCategory.TEAM,
  market: ClaimCategory.MARKET,
  revenue: ClaimCategory.REVENUE,
  product: ClaimCategory.PRODUCT,
  technology: ClaimCategory.TECHNOLOGY,
  other: ClaimCategory.OTHER,
};

export function toPrismaClaimCategory(
  category: SyntheticProfile["signals"][number]["referenceClaims"][number]["category"],
): ClaimCategory {
  return CLAIM_CATEGORY_MAP[category];
}

export function toSignalMeta(
  profile: SyntheticProfile,
  signal: SyntheticProfile["signals"][number],
): Prisma.InputJsonObject {
  return {
    ...signal.meta,
    corpusVersion: profile.schemaVersion,
    profileId: profile.profileId,
    archetype: profile.archetype,
    referenceClaimsCurated: true,
    ...(signal.contradiction ? { contradiction: signal.contradiction } : {}),
  };
}

export function assertIdentityOwner(
  identity: { founderId: string; source: SignalSource; handle: string },
  expectedFounderId: string,
): void {
  if (identity.founderId !== expectedFounderId) {
    throw new Error(
      `Identity collision for ${identity.source}:${identity.handle}; existing founder ${identity.founderId}, expected ${expectedFounderId}`,
    );
  }
}

export function assertSignalMatch(
  existing: {
    founderId: string | null;
    opportunityId: string | null;
    rawContent: string;
    occurredAt: Date | null;
    sourceUrl: string | null;
  },
  expected: {
    founderId: string;
    opportunityId: string;
    rawContent: string;
    occurredAt: Date;
    sourceUrl: string;
  },
): void {
  const matches =
    existing.founderId === expected.founderId &&
    existing.opportunityId === expected.opportunityId &&
    existing.rawContent === expected.rawContent &&
    existing.occurredAt?.getTime() === expected.occurredAt.getTime() &&
    existing.sourceUrl === expected.sourceUrl;

  if (!matches) {
    throw new Error(`Signal collision for ${expected.sourceUrl}; existing evidence differs from the corpus`);
  }
}

async function protectedCounts(prisma: PrismaClient) {
  // Keep these sequential: local Prisma Postgres/PGlite accepts one active query.
  const scoreHistory = await prisma.scoreHistory.count();
  const reasoningLog = await prisma.reasoningLog.count();
  return { scoreHistory, reasoningLog };
}

async function dryRun(prisma: PrismaClient, profiles: SyntheticProfile[]) {
  const created = emptyCounts();
  const reused = emptyCounts();

  for (const profile of profiles) {
    const founder = await prisma.founder.findUnique({ where: { email: profile.founder.email } });
    (founder ? reused : created).founders += 1;

    const company = await prisma.company.findFirst({ where: { name: profile.company.name } });
    (company ? reused : created).companies += 1;

    const opportunity = company
      ? await prisma.opportunity.findFirst({
          where: {
            companyId: company.id,
            track: profile.opportunity.track as Track,
            firstSignalAt: new Date(profile.opportunity.firstSignalAt),
          },
        })
      : null;
    (opportunity ? reused : created).opportunities += 1;

    const opportunityFounder =
      opportunity && founder
        ? await prisma.opportunityFounder.findUnique({
            where: {
              opportunityId_founderId: {
                opportunityId: opportunity.id,
                founderId: founder.id,
              },
            },
          })
        : null;
    (opportunityFounder ? reused : created).opportunityFounders += 1;

    for (const identity of profile.identities) {
      const existing = await prisma.identity.findUnique({
        where: {
          source_handle: {
            source: identity.source as SignalSource,
            handle: identity.handle,
          },
        },
      });
      if (existing && founder) assertIdentityOwner(existing, founder.id);
      (existing ? reused : created).identities += 1;
    }

    for (const signal of profile.signals) {
      const existingSignal = await prisma.signal.findFirst({ where: { sourceUrl: signal.sourceUrl } });
      if (existingSignal && founder && opportunity) {
        assertSignalMatch(existingSignal, {
          founderId: founder.id,
          opportunityId: opportunity.id,
          rawContent: signal.rawContent,
          occurredAt: new Date(signal.occurredAt),
          sourceUrl: signal.sourceUrl,
        });
      }
      (existingSignal ? reused : created).signals += 1;

      for (const claim of signal.referenceClaims) {
        const existingClaim = existingSignal
          ? await prisma.claim.findFirst({
              where: {
                signalId: existingSignal.id,
                text: claim.text,
                sourceLocation: claim.sourceLocation,
              },
            })
          : null;
        (existingClaim ? reused : created).claims += 1;
      }
    }
  }

  return { created, reused };
}

async function applyImport(prisma: PrismaClient, profiles: SyntheticProfile[]) {
  const created = emptyCounts();
  const reused = emptyCounts();

  for (const profile of profiles) {
    // Local Prisma Postgres/PGlite supports one active connection and can close
    // during long interactive transactions. Every operation remains serial and
    // collision-checked, so a stopped run can safely resume idempotently.
    const tx = prisma;
      let founder = await tx.founder.findUnique({ where: { email: profile.founder.email } });
      if (founder) {
        if (founder.name !== profile.founder.name) {
          throw new Error(`Founder email collision for ${profile.founder.email}`);
        }
        reused.founders += 1;
      } else {
        founder = await tx.founder.create({
          data: {
            name: profile.founder.name,
            email: profile.founder.email,
            context: profile.founder.context,
          },
        });
        created.founders += 1;
      }

      let company = await tx.company.findFirst({ where: { name: profile.company.name } });
      if (company) {
        if (
          company.oneLiner !== profile.company.oneLiner ||
          company.sector !== profile.company.sector ||
          company.stage !== profile.company.stage ||
          company.geography !== profile.company.geography
        ) {
          throw new Error(`Company collision for ${profile.company.name}`);
        }
        reused.companies += 1;
      } else {
        company = await tx.company.create({ data: profile.company });
        created.companies += 1;
      }

      const firstSignalAt = new Date(profile.opportunity.firstSignalAt);
      let opportunity = await tx.opportunity.findFirst({
        where: {
          companyId: company.id,
          track: profile.opportunity.track as Track,
          firstSignalAt,
        },
      });
      if (opportunity) {
        reused.opportunities += 1;
      } else {
        opportunity = await tx.opportunity.create({
          data: {
            companyId: company.id,
            track: profile.opportunity.track as Track,
            firstSignalAt,
          },
        });
        created.opportunities += 1;
      }

      const opportunityFounder = await tx.opportunityFounder.findUnique({
        where: {
          opportunityId_founderId: {
            opportunityId: opportunity.id,
            founderId: founder.id,
          },
        },
      });
      if (opportunityFounder) {
        reused.opportunityFounders += 1;
      } else {
        await tx.opportunityFounder.create({
          data: { opportunityId: opportunity.id, founderId: founder.id },
        });
        created.opportunityFounders += 1;
      }

      for (const identity of profile.identities) {
        const existing = await tx.identity.findUnique({
          where: {
            source_handle: {
              source: identity.source as SignalSource,
              handle: identity.handle,
            },
          },
        });
        if (existing) {
          assertIdentityOwner(existing, founder.id);
          reused.identities += 1;
        } else {
          await tx.identity.create({
            data: {
              founderId: founder.id,
              source: identity.source as SignalSource,
              handle: identity.handle,
              url: identity.url,
              matchConfidence: identity.matchConfidence,
            },
          });
          created.identities += 1;
        }
      }

      for (const signal of profile.signals) {
        const occurredAt = new Date(signal.occurredAt);
        let storedSignal = await tx.signal.findFirst({ where: { sourceUrl: signal.sourceUrl } });
        if (storedSignal) {
          assertSignalMatch(storedSignal, {
            founderId: founder.id,
            opportunityId: opportunity.id,
            rawContent: signal.rawContent,
            occurredAt,
            sourceUrl: signal.sourceUrl,
          });
          reused.signals += 1;
        } else {
          storedSignal = await tx.signal.create({
            data: {
              founderId: founder.id,
              opportunityId: opportunity.id,
              source: signal.source as SignalSource,
              sourceUrl: signal.sourceUrl,
              rawContent: signal.rawContent,
              occurredAt,
              meta: toSignalMeta(profile, signal),
            },
          });
          created.signals += 1;
        }

        for (const claim of signal.referenceClaims) {
          const existingClaim = await tx.claim.findFirst({
            where: {
              signalId: storedSignal.id,
              text: claim.text,
              sourceLocation: claim.sourceLocation,
            },
          });
          if (existingClaim) {
            reused.claims += 1;
          } else {
            await tx.claim.create({
              data: {
                signalId: storedSignal.id,
                text: claim.text,
                category: toPrismaClaimCategory(claim.category),
                sourceLocation: claim.sourceLocation,
                specificity: claim.specificity,
                evidenceRefs: {
                  syntheticReference: true,
                  extractionProvider: "curated-gate-1",
                  profileId: profile.profileId,
                },
              },
            });
            created.claims += 1;
          }
        }
      }
  }

  return { created, reused };
}

function parseMode(args: string[]): "dry-run" | "apply" {
  const apply = args.includes("--apply");
  const dryRunFlag = args.includes("--dry-run");
  if (apply && dryRunFlag) throw new Error("Choose either --apply or --dry-run, not both");
  return apply ? "apply" : "dry-run";
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const { profiles } = validateCorpus(await loadCorpus());
  const prisma = new PrismaClient();

  try {
    const before = await protectedCounts(prisma);
    const result = mode === "apply" ? await applyImport(prisma, profiles) : await dryRun(prisma, profiles);
    const after = await protectedCounts(prisma);

    if (before.scoreHistory !== after.scoreHistory || before.reasoningLog !== after.reasoningLog) {
      throw new Error("Protected append-only table counts changed during corpus import");
    }

    const report: ImportReport = {
      mode,
      corpus: corpusImportTotals(profiles),
      created: result.created,
      reused: result.reused,
      protectedRows: {
        scoreHistoryBefore: before.scoreHistory,
        scoreHistoryAfter: after.scoreHistory,
        reasoningLogBefore: before.reasoningLog,
        reasoningLogAfter: after.reasoningLog,
      },
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("import-corpus.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
