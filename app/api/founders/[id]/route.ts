import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Founder profile payload: score bands, history timeline, signals with claims
// and trust badges, interview questions. Everything the profile screen needs.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const founder = await prisma.founder.findUnique({
    where: { id },
    include: {
      score: true,
      scoreHistory: { orderBy: { createdAt: "asc" } },
      signals: { include: { claims: true }, orderBy: { ingestedAt: "desc" } },
      interviewQuestions: { orderBy: { createdAt: "desc" } },
      identities: true,
      opportunities: { include: { opportunity: { include: { company: true, axisScores: true } } } },
    },
  });
  if (!founder) return NextResponse.json({ error: "Founder not found" }, { status: 404 });
  return NextResponse.json(founder);
}
