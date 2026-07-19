import { NextResponse } from "next/server";
import { z } from "zod";
import { founderContextSchema } from "@/lib/contracts";
import { intakeOutboundFounder } from "@/lib/sourcing/intake";

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

  try {
    const result = await intakeOutboundFounder(parsed.data);
    return NextResponse.json({
      ...result,
      next: `POST /api/opportunities/${result.opportunityId}/run`,
    });
  } catch (error) {
    console.error("[scan] outbound intake failed:", error);
    return NextResponse.json({ error: "Outbound intake failed. Check server logs." }, { status: 500 });
  }
}
