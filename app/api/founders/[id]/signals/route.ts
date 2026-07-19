import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { deltaUpdate, extractClaims } from "@/lib/intel/stages";
import { renderBandSummary } from "@/lib/intel/founder-score";
import { applyDeltaUpdates, assembleBundle, snapshotFromDb } from "@/lib/persist";

// Ingest one new signal -> extract claims -> delta-update the bands -> append
// history. This IS the living-profile loop: interview notes come in with
// source "INTERVIEW" (demo beat 5), fetched signals with their own source.
export const maxDuration = 120;

const bodySchema = z.object({
  source: z.enum(["DECK", "APPLICATION", "GITHUB", "HACKER_NEWS", "DEVPOST", "ARXIV", "PRODUCT_HUNT", "BLOG", "INTERVIEW", "WEB", "SYNTHETIC", "OTHER"]),
  rawContent: z.string().min(10),
  sourceUrl: z.string().url().nullish(),
  occurredAt: z.coerce.date().nullish(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  try {
    const scoreRow = await prisma.founderScore.findUnique({ where: { founderId: id } });
    if (!scoreRow) {
      return NextResponse.json(
        { error: "Founder has no score yet — run the opportunity pipeline first." },
        { status: 409 }
      );
    }

    const signal = await prisma.signal.create({
      data: {
        founderId: id,
        source: parsed.data.source,
        sourceUrl: parsed.data.sourceUrl,
        rawContent: parsed.data.rawContent,
        occurredAt: parsed.data.occurredAt,
      },
    });

    const extraction = await extractClaims({ id: signal.id, source: signal.source, rawContent: signal.rawContent });
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

    const bundle = await assembleBundle(id);
    const delta = await deltaUpdate(
      renderBandSummary(snapshotFromDb(scoreRow)),
      { id: signal.id, source: signal.source, rawContent: signal.rawContent, occurredAt: signal.occurredAt },
      bundle
    );
    const snapshot = delta.updates.length > 0 ? await applyDeltaUpdates(id, delta, signal.id) : snapshotFromDb(scoreRow);

    return NextResponse.json({ signalId: signal.id, claimsExtracted: extraction.claims.length, updates: delta.updates, snapshot });
  } catch (error) {
    console.error(`[signal-ingest] founder ${id} failed:`, error);
    return NextResponse.json({ error: "Signal ingestion failed. Check server logs." }, { status: 500 });
  }
}
