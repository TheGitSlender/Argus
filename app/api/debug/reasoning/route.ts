import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Traceability viewer feed: recent ReasoningLog rows + aggregate cost/speed.
// Rough per-model pricing (USD per 1M tokens in/out).
const PRICING: Record<string, [number, number]> = {
  "gpt-4.1-nano": [0.1, 0.4],
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-4.1": [2, 8],
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const step = url.searchParams.get("step");
  const take = Math.min(Number(url.searchParams.get("take") ?? 100), 300);

  const [rows, all] = await Promise.all([
    prisma.reasoningLog.findMany({
      where: step ? { step } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, step: true, model: true, inputTokens: true, outputTokens: true, latencyMs: true, createdAt: true, inputRefs: true, output: true },
    }),
    prisma.reasoningLog.findMany({ select: { model: true, inputTokens: true, outputTokens: true, step: true } }),
  ]);

  let cost = 0;
  for (const r of all) {
    const [inP, outP] = PRICING[r.model] ?? [1, 4];
    cost += ((r.inputTokens ?? 0) / 1e6) * inP + ((r.outputTokens ?? 0) / 1e6) * outP;
  }
  const steps = [...new Set(all.map((r) => r.step))].sort();

  return NextResponse.json({
    aggregate: {
      totalCalls: all.length,
      totalInputTokens: all.reduce((a, r) => a + (r.inputTokens ?? 0), 0),
      totalOutputTokens: all.reduce((a, r) => a + (r.outputTokens ?? 0), 0),
      estimatedCostUsd: Math.round(cost * 100) / 100,
    },
    steps,
    rows: rows.map((r) => ({ ...r, output: r.output.length > 600 ? r.output.slice(0, 600) + "…" : r.output })),
  });
}
