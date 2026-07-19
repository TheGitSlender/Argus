import { ClaimCategory, Prisma, PrismaClient, type SignalSource } from "@prisma/client";
import {
  extractionOutputSchema,
  type ExtractedClaim,
  type ExtractionOutput,
} from "../../lib/contracts";
import {
  MODELS,
  runLLM,
  type LlmResult,
  type RunLlmOptions,
} from "../../lib/llm";

const DEFAULT_LIMIT = 3;

export interface SignalForExtraction {
  id: string;
  source: SignalSource;
  sourceUrl: string | null;
  rawContent: string;
  meta: Prisma.JsonValue | null;
  claims: Array<{ text: string; sourceLocation: string | null }>;
}

export type ExtractionRunner = (
  options: RunLlmOptions<ExtractionOutput>,
) => Promise<LlmResult<ExtractionOutput>>;

export interface PlannedClaim extends ExtractedClaim {
  text: string;
  sourceLocation: string | null;
}

export interface ExtractionPlan {
  signalId: string;
  cached: boolean;
  accepted: PlannedClaim[];
  rejected: Array<{ claim: ExtractedClaim; reason: string }>;
}

function asObject(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}

export function isAdaptionProcessed(meta: Prisma.JsonValue | null): boolean {
  const object = asObject(meta);
  if (!object) return false;
  if (object.adaptionProcessed === true || object.extractionProvider === "adaption") return true;
  const adaption = asObject(object.adaption ?? null);
  return adaption?.processed === true;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

export function claimKey(claim: { text: string; sourceLocation?: string | null }): string {
  return `${normalize(claim.text)}\u0000${normalize(claim.sourceLocation ?? "")}`;
}

export function buildExtractionPrompt(signal: SignalForExtraction): string {
  return [
    "Extract factual claims from the source below.",
    "Return JSON matching: { claims: [{ text, category, sourceLocation, specificity }] }.",
    "Every claim text MUST be copied verbatim as one contiguous substring of the source.",
    "Do not infer, calculate, summarize, normalize numbers, or add facts.",
    "Use slide markers such as 'Slide 7:' for sourceLocation when present; otherwise use null.",
    "If there are no factual claims, return {\"claims\":[]}.",
    "",
    `Source type: ${signal.source}`,
    `Source URL: ${signal.sourceUrl ?? "not provided"}`,
    "<source>",
    signal.rawContent,
    "</source>",
  ].join("\n");
}

function claimedSlide(rawContent: string, claimText: string): string | null {
  const normalizedClaim = normalize(claimText);
  let currentSlide: string | null = null;
  for (const block of rawContent.split(/(?=^Slide\s+\d+\s*:)/gim)) {
    const marker = block.match(/^Slide\s+(\d+)\s*:/i);
    if (marker) currentSlide = `slide ${marker[1]}`;
    if (normalize(block).includes(normalizedClaim)) return currentSlide;
  }
  return null;
}

export function validateGroundedClaim(
  rawContent: string,
  claim: ExtractedClaim,
): { accepted: true; claim: PlannedClaim } | { accepted: false; reason: string } {
  const text = claim.text.trim();
  if (!text) return { accepted: false, reason: "empty claim text" };
  if (!normalize(rawContent).includes(normalize(text))) {
    return { accepted: false, reason: "claim is not a verbatim source substring" };
  }

  const expectedSlide = claimedSlide(rawContent, text);
  const suppliedLocation = claim.sourceLocation?.trim() || null;
  if (expectedSlide && suppliedLocation && normalize(suppliedLocation) !== expectedSlide) {
    return { accepted: false, reason: `source location does not match ${expectedSlide}` };
  }

  return {
    accepted: true,
    claim: {
      ...claim,
      text,
      sourceLocation: expectedSlide ?? suppliedLocation,
    },
  };
}

export async function planSignalClaims(
  signal: SignalForExtraction,
  runner: ExtractionRunner = runLLM,
): Promise<ExtractionPlan> {
  if (isAdaptionProcessed(signal.meta)) {
    throw new Error(`Signal ${signal.id} was already processed by Adaption`);
  }

  const result = await runner({
    step: "extract_claims",
    model: MODELS.extract,
    system: "You are a strict extractive data parser. Never add facts not present in the source.",
    prompt: buildExtractionPrompt(signal),
    temperature: 0,
    maxTokens: 2048,
    schema: extractionOutputSchema,
    inputRefs: { signalId: signal.id },
  });

  const existing = new Set(signal.claims.map(claimKey));
  const accepted: PlannedClaim[] = [];
  const rejected: ExtractionPlan["rejected"] = [];

  for (const candidate of result.parsed.claims) {
    const grounded = validateGroundedClaim(signal.rawContent, candidate);
    if (!grounded.accepted) {
      rejected.push({ claim: candidate, reason: grounded.reason });
      continue;
    }
    const key = claimKey(grounded.claim);
    if (existing.has(key)) {
      rejected.push({ claim: candidate, reason: "duplicate claim" });
      continue;
    }
    existing.add(key);
    accepted.push(grounded.claim);
  }

  return { signalId: signal.id, cached: result.cached, accepted, rejected };
}

const CATEGORY_MAP: Record<ExtractedClaim["category"], ClaimCategory> = {
  traction: ClaimCategory.TRACTION,
  team: ClaimCategory.TEAM,
  market: ClaimCategory.MARKET,
  revenue: ClaimCategory.REVENUE,
  product: ClaimCategory.PRODUCT,
  technology: ClaimCategory.TECHNOLOGY,
  other: ClaimCategory.OTHER,
};

async function candidates(prisma: PrismaClient, signalId: string | null, limit: number) {
  if (signalId) {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: { claims: { select: { text: true, sourceLocation: true } } },
    });
    if (!signal) throw new Error(`Signal not found: ${signalId}`);
    return isAdaptionProcessed(signal.meta) ? [] : [signal];
  }

  const signals = await prisma.signal.findMany({
    where: { claims: { none: {} } },
    orderBy: [{ ingestedAt: "asc" }, { id: "asc" }],
    include: { claims: { select: { text: true, sourceLocation: true } } },
  });
  return signals.filter((signal) => !isAdaptionProcessed(signal.meta)).slice(0, limit);
}

function parseArgs(args: string[]) {
  const apply = args.includes("--apply");
  if (apply && args.includes("--dry-run")) throw new Error("Choose --apply or --dry-run, not both");
  const signalIndex = args.indexOf("--signal-id");
  const limitIndex = args.indexOf("--limit");
  const signalId = signalIndex >= 0 ? args[signalIndex + 1] : null;
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : DEFAULT_LIMIT;
  if (signalIndex >= 0 && !signalId) throw new Error("--signal-id requires a value");
  if (!Number.isInteger(limit) || limit < 1 || limit > DEFAULT_LIMIT) {
    throw new Error(`--limit must be an integer from 1 to ${DEFAULT_LIMIT}`);
  }
  return { mode: apply ? ("apply" as const) : ("dry-run" as const), signalId, limit };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    const selected = await candidates(prisma, args.signalId, args.limit);
    if (args.mode === "dry-run") {
      console.log(JSON.stringify({ mode: args.mode, selected: selected.map((signal) => signal.id) }, null, 2));
      return;
    }
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for --apply");

    const reports = [];
    for (const signal of selected) {
      const plan = await planSignalClaims(signal);
      let created = 0;
      for (const claim of plan.accepted) {
        const duplicate = await prisma.claim.findFirst({
          where: { signalId: signal.id, text: claim.text, sourceLocation: claim.sourceLocation },
        });
        if (duplicate) continue;
        await prisma.claim.create({
          data: {
            signalId: signal.id,
            text: claim.text,
            category: CATEGORY_MAP[claim.category],
            sourceLocation: claim.sourceLocation,
            specificity: claim.specificity,
            evidenceRefs: {
              extractionProvider: "runtime-run-llm",
              grounding: "exact-source-substring",
              reasoningCacheHit: plan.cached,
            },
          },
        });
        created += 1;
      }
      reports.push({ ...plan, created });
    }
    console.log(JSON.stringify({ mode: args.mode, reports }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("claim-extraction.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
