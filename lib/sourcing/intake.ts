import { prisma } from "@/lib/db";
import { founderContextSchema } from "@/lib/contracts";
import { extractClaims } from "@/lib/intel/stages";

// Shared outbound intake logic. Extracted from app/api/scan/route.ts so that
// both the API route and the sourcing scanners can call it without duplicating
// the entity-resolution → founder → company → opportunity → signal → claims flow.

export interface OutboundIntakeData {
  founderName: string;
  companyName?: string | null;
  source: string;
  handle: string;
  sourceUrl?: string | null;
  rawContent: string;
  occurredAt?: Date | null;
  meta?: Record<string, unknown> | null;
  context?: Partial<{
    teamStatus: string;
    occupation: string;
    priorFunding: string;
    location: string;
  }> | null;
  matchConfidence?: number;
}

export interface IntakeResult {
  founderId: string;
  opportunityId: string;
  knownFounder: boolean;
  claimsExtracted: number;
}

export async function intakeOutboundFounder(data: OutboundIntakeData): Promise<IntakeResult> {
  const source = data.source as "GITHUB" | "HACKER_NEWS" | "DEVPOST" | "ARXIV" | "PRODUCT_HUNT" | "BLOG" | "WEB" | "SYNTHETIC" | "OTHER";

  // Entity resolution first: same source+handle -> same founder.
  const identity = await prisma.identity.findUnique({
    where: { source_handle: { source, handle: data.handle } },
    include: { founder: true },
  });

  const founder =
    identity?.founder ??
    (await prisma.founder.create({
      data: {
        name: data.founderName,
        context: founderContextSchema.parse(data.context ?? {}),
        identities: {
          create: [{
            source,
            handle: data.handle,
            url: data.sourceUrl ?? undefined,
            matchConfidence: data.matchConfidence ?? 0.9,
          }],
        },
      },
    }));

  // A re-scan of a known founder attaches to their open outbound opportunity
  // instead of spawning a duplicate deal (and duplicate pre-company) per scan.
  const existingOpen = identity
    ? await prisma.opportunity.findFirst({
        where: {
          track: "OUTBOUND",
          status: { in: ["SOURCED", "SCREENED"] },
          founders: { some: { founderId: founder.id } },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  let opportunity = existingOpen;
  if (!opportunity) {
    const company = await prisma.company.create({
      data: { name: data.companyName ?? `${data.founderName} (pre-company)` },
    });
    opportunity = await prisma.opportunity.create({
      data: {
        companyId: company.id,
        track: "OUTBOUND",
        firstSignalAt: data.occurredAt ?? new Date(),
        founders: { create: [{ founderId: founder.id }] },
      },
    });
  }

  const signal = await prisma.signal.create({
    data: {
      founderId: founder.id,
      opportunityId: opportunity.id,
      source,
      sourceUrl: data.sourceUrl ?? undefined,
      rawContent: data.rawContent,
      occurredAt: data.occurredAt ?? undefined,
      meta: (data.meta ?? undefined) as object | undefined,
    },
  });

  const extraction = await extractClaims({
    id: signal.id,
    source,
    rawContent: data.rawContent,
  });

  if (extraction.claims.length > 0) {
    await prisma.claim.createMany({
      data: extraction.claims.map((c) => ({
        signalId: signal.id,
        text: c.text,
        category: c.category.toUpperCase() as "TRACTION" | "TEAM" | "MARKET" | "REVENUE" | "PRODUCT" | "TECHNOLOGY" | "OTHER",
        sourceLocation: c.sourceLocation,
        specificity: c.specificity,
      })),
    });
  }

  return {
    founderId: founder.id,
    opportunityId: opportunity.id,
    knownFounder: Boolean(identity),
    claimsExtracted: extraction.claims.length,
  };
}
