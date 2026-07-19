import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { thesisConfigSchema } from "@/lib/contracts";

export async function GET() {
  const thesis = await prisma.thesis.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(thesis);
}

// Replaces the active thesis (deactivates prior ones — configurable lens, FAQ 15).
export async function POST(req: Request) {
  const parsed = thesisConfigSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const thesis = await prisma.$transaction(async (tx) => {
    await tx.thesis.updateMany({ where: { active: true }, data: { active: false } });
    return tx.thesis.create({ data: { ...parsed.data, active: true } });
  });
  return NextResponse.json(thesis);
}
