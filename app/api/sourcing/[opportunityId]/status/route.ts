import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  status: z.enum(["IDENTIFIED", "DRAFTED", "SENT", "REPLIED", "CONVERTED", "DECLINED", "EXPIRED"]),
  notes: z.string().nullish(),
  draftMessage: z.string().nullish(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const { opportunityId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  const { status, notes, draftMessage } = parsed.data;

  try {
    const existing = await prisma.outreach.findUnique({
      where: { opportunityId },
    });

    if (!existing) {
      return NextResponse.json({ error: "No outreach record for this opportunity." }, { status: 404 });
    }

    const now = new Date();
    const updateData: {
      status: typeof status;
      notes?: string | null;
      draftMessage?: string | null;
      sentAt?: Date | null;
      repliedAt?: Date | null;
      convertedAt?: Date | null;
    } = { status };

    if (notes !== undefined) updateData.notes = notes;
    if (draftMessage !== undefined) updateData.draftMessage = draftMessage;

    // Set timestamps based on status transitions.
    if (status === "SENT" && !existing.sentAt) updateData.sentAt = now;
    if (status === "REPLIED" && !existing.repliedAt) updateData.repliedAt = now;
    if (status === "CONVERTED" && !existing.convertedAt) updateData.convertedAt = now;

    const outreach = await prisma.outreach.update({
      where: { opportunityId },
      data: updateData,
    });

    return NextResponse.json(outreach);
  } catch (error) {
    console.error("[sourcing/status] PATCH failed:", error);
    return NextResponse.json({ error: "Status update failed." }, { status: 500 });
  }
}
