import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Dashboard list: opportunities with company, axis scores, and each founder's
// score snapshot (bands + visibility gap) for the scatter + ranked table.
export async function GET() {
  // List payload is deliberately slim: no memos (fetched per-opportunity),
  // no axis rows, no founder context — cuts response size ~10x for 40+ rows.
  const opportunities = await prisma.opportunity.findMany({
    select: {
      id: true,
      track: true,
      status: true,
      decision: true,
      createdAt: true,
      firstSignalAt: true,
      decidedAt: true,
      company: { select: { id: true, name: true, sector: true, stage: true, geography: true } },
      founders: {
        select: {
          founderId: true,
          founder: {
            select: {
              id: true,
              name: true,
              score: {
                select: {
                  composite: true,
                  visibilityIndex: true,
                  capabilityVisibilityGap: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(opportunities, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
