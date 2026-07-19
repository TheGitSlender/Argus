import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Dashboard list: opportunities with company, axis scores, and each founder's
// score snapshot (bands + visibility gap) for the scatter + ranked table.
export async function GET() {
  const opportunities = await prisma.opportunity.findMany({
    include: {
      company: true,
      axisScores: { orderBy: { createdAt: "desc" } },
      founders: { include: { founder: { include: { score: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(opportunities);
}
