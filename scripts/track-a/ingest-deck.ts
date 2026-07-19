import { readFile } from "node:fs/promises";
import { Prisma, PrismaClient, SignalSource } from "@prisma/client";
import { z } from "zod";

const extractedPageSchema = z.object({
  slide: z.number().int().positive(),
  text: z.string(),
});

export const extractedDeckSchema = z
  .object({
    schemaVersion: z.literal("track-a.deck-text.v1"),
    sourceFile: z.string().min(1),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    pageCount: z.number().int().positive(),
    emptySlides: z.array(z.number().int().positive()),
    pages: z.array(extractedPageSchema).min(1),
    text: z.string().min(1),
  })
  .superRefine((deck, context) => {
    if (deck.pages.length !== deck.pageCount) {
      context.addIssue({ code: "custom", message: "pageCount must equal pages.length" });
    }
    deck.pages.forEach((page, index) => {
      if (page.slide !== index + 1) {
        context.addIssue({ code: "custom", message: "slides must be contiguous and one-indexed" });
      }
    });
    const expectedEmpty = deck.pages.filter((page) => !page.text).map((page) => page.slide);
    if (JSON.stringify(deck.emptySlides) !== JSON.stringify(expectedEmpty)) {
      context.addIssue({ code: "custom", message: "emptySlides does not match empty page text" });
    }
    const expectedText = deck.pages
      .map((page) => `Slide ${page.slide}:\n${page.text}`.trimEnd())
      .join("\n\n");
    if (deck.text !== expectedText) {
      context.addIssue({ code: "custom", message: "text does not match page content" });
    }
  });

export type ExtractedDeck = z.infer<typeof extractedDeckSchema>;

interface ExpectedDeckSignal {
  founderId: string | null;
  opportunityId: string | null;
  sourceUrl: string;
  rawContent: string;
  sourceSha256: string;
}

function metaHash(meta: Prisma.JsonValue | null): string | null {
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) return null;
  const hash = (meta as Record<string, Prisma.JsonValue>).sourceSha256;
  return typeof hash === "string" ? hash : null;
}

export function assertDeckSignalMatch(
  existing: {
    founderId: string | null;
    opportunityId: string | null;
    source: SignalSource;
    sourceUrl: string | null;
    rawContent: string;
    meta: Prisma.JsonValue | null;
  },
  expected: ExpectedDeckSignal,
): void {
  if (
    existing.source !== SignalSource.DECK ||
    existing.sourceUrl !== expected.sourceUrl ||
    existing.founderId !== expected.founderId ||
    existing.opportunityId !== expected.opportunityId ||
    existing.rawContent !== expected.rawContent ||
    metaHash(existing.meta) !== expected.sourceSha256
  ) {
    throw new Error(`Signal collision for ${expected.sourceUrl}; existing evidence differs from the deck`);
  }
}

function valueAfter(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(args: string[]) {
  const apply = args.includes("--apply");
  if (apply && args.includes("--dry-run")) throw new Error("Choose --apply or --dry-run, not both");
  const extractionPath = valueAfter(args, "--extraction");
  const sourceUrl = valueAfter(args, "--source-url");
  if (!extractionPath) throw new Error("--extraction is required");
  if (!sourceUrl) throw new Error("--source-url is required");
  try {
    new URL(sourceUrl);
  } catch {
    throw new Error("--source-url must be an absolute URL");
  }
  const occurredAtValue = valueAfter(args, "--occurred-at");
  const occurredAt = occurredAtValue ? new Date(occurredAtValue) : null;
  if (occurredAt && Number.isNaN(occurredAt.getTime())) throw new Error("--occurred-at must be an ISO date");
  return {
    mode: apply ? ("apply" as const) : ("dry-run" as const),
    extractionPath,
    sourceUrl,
    founderId: valueAfter(args, "--founder-id"),
    opportunityId: valueAfter(args, "--opportunity-id"),
    occurredAt,
  };
}

async function assertRelations(
  prisma: PrismaClient,
  founderId: string | null,
  opportunityId: string | null,
): Promise<void> {
  if (founderId && !(await prisma.founder.findUnique({ where: { id: founderId }, select: { id: true } }))) {
    throw new Error(`Founder not found: ${founderId}`);
  }
  if (opportunityId) {
    const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { id: true } });
    if (!opportunity) throw new Error(`Opportunity not found: ${opportunityId}`);
  }
  if (founderId && opportunityId) {
    const link = await prisma.opportunityFounder.findUnique({
      where: { opportunityId_founderId: { opportunityId, founderId } },
    });
    if (!link) throw new Error("Founder is not linked to the supplied opportunity");
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const deck = extractedDeckSchema.parse(JSON.parse(await readFile(args.extractionPath, "utf8")));
  const prisma = new PrismaClient();
  try {
    await assertRelations(prisma, args.founderId, args.opportunityId);
    const existing = await prisma.signal.findFirst({ where: { sourceUrl: args.sourceUrl } });
    const expected: ExpectedDeckSignal = {
      founderId: args.founderId,
      opportunityId: args.opportunityId,
      sourceUrl: args.sourceUrl,
      rawContent: deck.text,
      sourceSha256: deck.sourceSha256,
    };
    if (existing) assertDeckSignalMatch(existing, expected);

    if (args.mode === "apply" && !existing) {
      const created = await prisma.signal.create({
        data: {
          founderId: args.founderId,
          opportunityId: args.opportunityId,
          source: SignalSource.DECK,
          sourceUrl: args.sourceUrl,
          rawContent: deck.text,
          occurredAt: args.occurredAt,
          meta: {
            extractionProvider: "local-pypdf",
            deckSchemaVersion: deck.schemaVersion,
            sourceFile: deck.sourceFile,
            sourceSha256: deck.sourceSha256,
            pageCount: deck.pageCount,
            emptySlides: deck.emptySlides,
          },
        },
      });
      console.log(JSON.stringify({ mode: args.mode, action: "created", signalId: created.id }, null, 2));
      return;
    }

    console.log(
      JSON.stringify(
        {
          mode: args.mode,
          action: existing ? "reuse" : "create",
          signalId: existing?.id ?? null,
          sourceSha256: deck.sourceSha256,
          pageCount: deck.pageCount,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("ingest-deck.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
