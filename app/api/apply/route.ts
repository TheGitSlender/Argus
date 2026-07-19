import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { founderContextSchema } from "@/lib/contracts";
import { extractClaims } from "@/lib/intel/stages";

// Inbound intake: deck + company name is the minimum bar (brief FAQ 4).
// One optional field: a link to anything they've made — artifacts, not
// credentials. Creates Founder + Company + Opportunity + deck Signal + Claims.
export const maxDuration = 120;

const bodySchema = z.object({
  companyName: z.string().min(1),
  founderName: z.string().min(1),
  deckText: z.string().min(50),
  email: z.string().email().nullish(),
  artifactUrl: z.string().url().nullish(),
  context: founderContextSchema.partial().nullish(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;

  try {
    // Founder Score persistence (FAQ 6): a returning founder keeps their score.
    const existing = body.email ? await prisma.founder.findUnique({ where: { email: body.email } }) : null;
    const founder =
      existing ??
      (await prisma.founder.create({
        data: {
          name: body.founderName,
          email: body.email,
          context: founderContextSchema.parse(body.context ?? {}),
        },
      }));

    const company = await prisma.company.create({ data: { name: body.companyName } });
    const now = new Date();
    const opportunity = await prisma.opportunity.create({
      data: {
        companyId: company.id,
        track: "INBOUND",
        firstSignalAt: now,
        founders: { create: [{ founderId: founder.id }] },
      },
    });

    const deckSignal = await prisma.signal.create({
      data: { founderId: founder.id, opportunityId: opportunity.id, source: "DECK", rawContent: body.deckText, occurredAt: now },
    });
    if (body.artifactUrl) {
      await prisma.signal.create({
        data: {
          founderId: founder.id,
          opportunityId: opportunity.id,
          source: "WEB",
          sourceUrl: body.artifactUrl,
          rawContent: `Founder-submitted artifact link: ${body.artifactUrl}`,
          occurredAt: now,
        },
      });
    }

    const extraction = await extractClaims({ id: deckSignal.id, source: "DECK", rawContent: body.deckText });
    if (extraction.claims.length > 0) {
      await prisma.claim.createMany({
        data: extraction.claims.map((c) => ({
          signalId: deckSignal.id,
          text: c.text,
          category: c.category.toUpperCase() as "TRACTION" | "TEAM" | "MARKET" | "REVENUE" | "PRODUCT" | "TECHNOLOGY" | "OTHER",
          sourceLocation: c.sourceLocation,
          specificity: c.specificity,
        })),
      });
    }

    return NextResponse.json({
      founderId: founder.id,
      returningFounder: Boolean(existing),
      companyId: company.id,
      opportunityId: opportunity.id,
      claimsExtracted: extraction.claims.length,
      next: `POST /api/opportunities/${opportunity.id}/run`,
    });
  } catch (error) {
    console.error("[apply] intake failed:", error);
    return NextResponse.json({ error: "Application intake failed. Check server logs." }, { status: 500 });
  }
}
