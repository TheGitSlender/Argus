import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient, SignalSource } from "@prisma/client";
import { z } from "zod";
import { loadCorpus } from "./corpus-schema";

const sourceSchema = z.enum([
  "DECK",
  "APPLICATION",
  "GITHUB",
  "HACKER_NEWS",
  "DEVPOST",
  "ARXIV",
  "PRODUCT_HUNT",
  "BLOG",
  "INTERVIEW",
  "WEB",
  "SYNTHETIC",
  "OTHER",
]);

export const entityCandidateSchema = z
  .object({
    candidateId: z.string().regex(/^candidate-[a-z0-9-]+$/),
    name: z.string().min(3),
    email: z.string().email().optional(),
    companyName: z.string().min(2).optional(),
    location: z.string().min(2).optional(),
    identities: z
      .array(
        z
          .object({
            source: sourceSchema,
            handle: z.string().min(2),
            url: z.string().startsWith("synthetic://"),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type EntityCandidate = z.infer<typeof entityCandidateSchema>;

export interface ResolverFounder {
  id: string;
  name: string;
  email: string | null;
  location: string | null;
  companies: string[];
  identities: Array<{ source: SignalSource; handle: string }>;
}

export interface ResolutionResult {
  candidateId: string;
  status: "linked" | "review" | "unresolved" | "conflict";
  founderId: string | null;
  confidence: number;
  matchedBy: string[];
  reason: string;
}

export function normalizeEntityText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedEmail(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function candidateScore(candidate: EntityCandidate, founder: ResolverFounder): {
  score: number;
  matchedBy: string[];
} {
  if (normalizeEntityText(candidate.name) !== normalizeEntityText(founder.name)) {
    return { score: 0, matchedBy: [] };
  }

  let score = 0.65;
  const matchedBy = ["normalized_name"];
  const companyMatch = Boolean(
    candidate.companyName &&
      founder.companies.some(
        (company) => normalizeEntityText(company) === normalizeEntityText(candidate.companyName!),
      ),
  );
  const locationMatch = Boolean(
    candidate.location &&
      founder.location &&
      normalizeEntityText(candidate.location) === normalizeEntityText(founder.location),
  );

  if (companyMatch) {
    score += 0.21;
    matchedBy.push("company");
  }
  if (locationMatch) {
    score += 0.17;
    matchedBy.push("location");
  }

  return { score: Math.min(score, 0.94), matchedBy };
}

export function resolveCandidate(
  candidate: EntityCandidate,
  founders: ResolverFounder[],
): ResolutionResult {
  const exactMatches = new Map<string, Set<string>>();
  const addExactMatch = (founderId: string, reason: string) => {
    const reasons = exactMatches.get(founderId) ?? new Set<string>();
    reasons.add(reason);
    exactMatches.set(founderId, reasons);
  };

  const email = normalizedEmail(candidate.email);
  if (email) {
    for (const founder of founders) {
      if (normalizedEmail(founder.email) === email) addExactMatch(founder.id, "email");
    }
  }

  for (const hint of candidate.identities) {
    for (const founder of founders) {
      if (
        founder.identities.some(
          (identity) => identity.source === hint.source && identity.handle === hint.handle,
        )
      ) {
        addExactMatch(founder.id, `${hint.source}:${hint.handle}`);
      }
    }
  }

  if (exactMatches.size > 1) {
    return {
      candidateId: candidate.candidateId,
      status: "conflict",
      founderId: null,
      confidence: 0,
      matchedBy: [...exactMatches.values()].flatMap((reasons) => [...reasons]),
      reason: "Exact identifiers point to different founders; no identity was changed.",
    };
  }

  if (exactMatches.size === 1) {
    const [founderId, reasons] = [...exactMatches.entries()][0];
    return {
      candidateId: candidate.candidateId,
      status: "linked",
      founderId,
      confidence: reasons.has("email") ? 1 : 0.98,
      matchedBy: [...reasons],
      reason: "Exact identifier match accepted.",
    };
  }

  const scored = founders
    .map((founder) => ({ founder, ...candidateScore(candidate, founder) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      candidateId: candidate.candidateId,
      status: "unresolved",
      founderId: null,
      confidence: 0,
      matchedBy: [],
      reason: "No existing founder matched; founder creation requires a separate reviewed workflow.",
    };
  }

  const top = scored[0];
  const second = scored[1];
  if (second && Math.abs(top.score - second.score) <= 0.03) {
    return {
      candidateId: candidate.candidateId,
      status: "unresolved",
      founderId: null,
      confidence: top.score,
      matchedBy: top.matchedBy,
      reason: "Ambiguous normalized-name match; multiple founders scored equivalently.",
    };
  }

  if (top.score >= 0.8) {
    return {
      candidateId: candidate.candidateId,
      status: "review",
      founderId: top.founder.id,
      confidence: top.score,
      matchedBy: top.matchedBy,
      reason: "Name plus company/location evidence requires human review; no identity was persisted.",
    };
  }

  return {
    candidateId: candidate.candidateId,
    status: "unresolved",
    founderId: null,
    confidence: top.score,
    matchedBy: top.matchedBy,
    reason: "Name-only evidence is below the 0.80 review threshold.",
  };
}

export function resolveCandidates(
  candidates: EntityCandidate[],
  founders: ResolverFounder[],
): ResolutionResult[] {
  return candidates.map((candidate) => resolveCandidate(candidate, founders));
}

export async function loadEntityCandidates(
  filePath = resolve(process.cwd(), "data", "track-a", "entity-candidates.jsonl"),
): Promise<EntityCandidate[]> {
  const rows = await loadCorpus(filePath);
  return rows.map((row, index) => {
    const result = entityCandidateSchema.safeParse(row);
    if (!result.success) {
      throw new Error(`Entity candidate row ${index + 1} is invalid: ${z.prettifyError(result.error)}`);
    }
    return result.data;
  });
}

async function loadResolverFounders(prisma: PrismaClient): Promise<ResolverFounder[]> {
  const founders = await prisma.founder.findMany({
    include: {
      identities: true,
      opportunities: {
        include: { opportunity: { include: { company: true } } },
      },
    },
  });

  return founders.map((founder) => {
    const context = founder.context as { location?: unknown };
    return {
      id: founder.id,
      name: founder.name,
      email: founder.email,
      location: typeof context.location === "string" ? context.location : null,
      companies: founder.opportunities.map((link) => link.opportunity.company.name),
      identities: founder.identities.map((identity) => ({
        source: identity.source,
        handle: identity.handle,
      })),
    };
  });
}

async function persistExactIdentities(
  prisma: PrismaClient,
  candidates: EntityCandidate[],
  results: ResolutionResult[],
) {
  let created = 0;
  let reused = 0;

  for (const result of results) {
    if (result.status !== "linked" || !result.founderId) continue;
    const candidate = candidates.find((item) => item.candidateId === result.candidateId);
    if (!candidate) throw new Error(`Missing candidate ${result.candidateId}`);

    for (const hint of candidate.identities) {
      const existing = await prisma.identity.findUnique({
        where: {
          source_handle: {
            source: hint.source as SignalSource,
            handle: hint.handle,
          },
        },
      });
      if (existing) {
        if (existing.founderId !== result.founderId) {
          throw new Error(`Identity collision while persisting ${hint.source}:${hint.handle}`);
        }
        reused += 1;
      } else {
        await prisma.identity.create({
          data: {
            founderId: result.founderId,
            source: hint.source as SignalSource,
            handle: hint.handle,
            url: hint.url,
            matchConfidence: result.confidence,
          },
        });
        created += 1;
      }
    }
  }

  return { created, reused };
}

function parseArgs(args: string[]) {
  const apply = args.includes("--apply");
  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex >= 0
      ? args[outputIndex + 1]
      : join(tmpdir(), "argus-track-a-entity-resolution-report.json");
  if (outputIndex >= 0 && !outputPath) throw new Error("--output requires a path");
  return { mode: apply ? ("apply" as const) : ("dry-run" as const), outputPath };
}

async function main() {
  const { mode, outputPath } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const candidates = await loadEntityCandidates();
    const founders = await loadResolverFounders(prisma);
    const scoreHistoryBefore = await prisma.scoreHistory.count();
    const reasoningLogBefore = await prisma.reasoningLog.count();
    const results = resolveCandidates(candidates, founders);
    const persistence =
      mode === "apply" ? await persistExactIdentities(prisma, candidates, results) : { created: 0, reused: 0 };
    const scoreHistoryAfter = await prisma.scoreHistory.count();
    const reasoningLogAfter = await prisma.reasoningLog.count();

    if (scoreHistoryBefore !== scoreHistoryAfter || reasoningLogBefore !== reasoningLogAfter) {
      throw new Error("Protected append-only table counts changed during entity resolution");
    }

    const report = {
      generatedAt: new Date().toISOString(),
      mode,
      summary: {
        candidates: results.length,
        linked: results.filter((result) => result.status === "linked").length,
        review: results.filter((result) => result.status === "review").length,
        unresolved: results.filter((result) => result.status === "unresolved").length,
        conflict: results.filter((result) => result.status === "conflict").length,
        identitiesCreated: persistence.created,
        identitiesReused: persistence.reused,
      },
      protectedRows: {
        scoreHistoryBefore,
        scoreHistoryAfter,
        reasoningLogBefore,
        reasoningLogAfter,
      },
      results,
    };

    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, reportPath: outputPath }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("entity-resolution.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
