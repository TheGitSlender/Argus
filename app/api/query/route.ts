import { NextResponse } from "next/server";
import { z } from "zod";
import { nlQueryToFilter } from "@/lib/intel/stages";

// NL query bar (brief MVP #3): one pass, not five manual filters. Returns the
// structured filter; the dashboard applies it client/server-side.
export async function POST(req: Request) {
  const parsed = z.object({ q: z.string().min(2) }).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Body must be { q: string }" }, { status: 400 });
  }
  try {
    const filter = await nlQueryToFilter(parsed.data.q);
    return NextResponse.json({ query: parsed.data.q, filter });
  } catch (error) {
    console.error("[nl-query] failed:", error);
    return NextResponse.json({ error: "Query translation failed." }, { status: 500 });
  }
}
