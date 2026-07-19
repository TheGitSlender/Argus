import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { founderContextSchema } from "@/lib/contracts";
import { extractClaims } from "@/lib/intel/stages";

// Outbound intake: a discovered founder (GitHub scan, hackathon page, paper)
// enters the SAME funnel as an applicant (brief MVP #5: converge). Track A's
// fetchers POST here. Dedupes via Identity (source+handle) before creating.
export const maxDuration = 120;

const bodySchema = z.object({
  founderName: z.string().min(1),
  companyName: z.string().min(1).nullish(),
  source: z.enum(["GITHUB", "HACKER_NEWS", "DEVPOST", "ARXIV", "PRODUCT_HUNT", "BLOG", "WEB", "SYNTHETIC", "OTHER"]),
  handle: z.string().min(1),
  sourceUrl: z.string().url().nullish(),
  rawContent: z.string().min(30),
  occurredAt: z.coerce.date().nullish(),
  meta: z.record(z.string(), z.unknown()).nullish(),
  context: founderContextSchema.partial().nullish(),
  matchConfidence: z.number().min(0).max(1).default(0.9),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;

  try {
    // Entity resolution first: same source+handle -> same founder.
    const identity = await prisma.identity.findUnique({
      where: { source_handle: { source: body.source, handle: body.handle } },
      include: { founder: true },
    });

    const founder =
      identity?.founder ??
      (await prisma.founder.create({
        data: {
          name: body.founderName,
          context: founderContextSchema.parse(body.context ?? {}),
          identities: {
            create: [{ source: body.source, handle: body.handle, url: body.sourceUrl, matchConfidence: body.matchConfidence }],
          },
        },
      }));

    const company = await prisma.company.create({
      data: { name: body.companyName ?? `${body.founderName} (pre-company)` },
    });
    const opportunity = await prisma.opportunity.create({
      data: {
        companyId: company.id,
        track: "OUTBOUND",
        firstSignalAt: body.occurredAt ?? new Date(),
        founders: { create: [{ founderId: founder.id }] },
      },
    });

    const signal = await prisma.signal.create({
      data: {
        founderId: founder.id,
        opportunityId: opportunity.id,
        source: body.source,
        sourceUrl: body.sourceUrl,
        rawContent: body.rawContent,
        occurredAt: body.occurredAt,
        meta: (body.meta ?? undefined) as object | undefined,
      },
    });

    const extraction = await extractClaims({ id: signal.id, source: body.source, rawContent: body.rawContent });
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

    return NextResponse.json({
      founderId: founder.id,
      knownFounder: Boolean(identity),
      opportunityId: opportunity.id,
      claimsExtracted: extraction.claims.length,
      next: `POST /api/opportunities/${opportunity.id}/run`,
    });
  } catch (error) {
    console.error("[scan] outbound intake failed:", error);
    return NextResponse.json({ error: "Outbound intake failed. Check server logs." }, { status: 500 });
  }
}
