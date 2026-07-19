import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

export const ARCHETYPES = [
  "hidden_gem",
  "hype",
  "cold_start",
  "contradiction",
  "research",
  "balanced",
] as const;

export const EXPECTED_ARCHETYPE_COUNTS: Record<(typeof ARCHETYPES)[number], number> = {
  hidden_gem: 8,
  hype: 6,
  cold_start: 6,
  contradiction: 4,
  research: 6,
  balanced: 6,
};

const signalSourceSchema = z.enum([
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

const claimSchema = z
  .object({
    text: z.string().min(8),
    category: z.enum([
      "traction",
      "team",
      "market",
      "revenue",
      "product",
      "technology",
      "other",
    ]),
    sourceLocation: z.string().min(2),
    specificity: z.enum(["high", "medium", "low"]),
  })
  .strict();

const signalSchema = z
  .object({
    signalId: z.string().regex(/^sig-[a-z0-9-]+$/),
    source: signalSourceSchema,
    sourceUrl: z.string().startsWith("synthetic://"),
    occurredAt: z.string().datetime(),
    rawContent: z.string().min(30),
    contradiction: z
      .object({
        caseId: z.string().regex(/^contradiction-[0-9]{2}$/),
        role: z.enum(["assertion", "counter_evidence"]),
      })
      .strict()
      .optional(),
    meta: z
      .object({
        synthetic: z.literal(true),
        ingestionKey: z.string().regex(/^track-a:[a-z0-9:-]+$/),
        evidenceKind: z.enum([
          "deck",
          "build_log",
          "launch_record",
          "research_abstract",
          "technical_note",
          "visibility_snapshot",
          "counter_evidence",
        ]),
        visibilityOnly: z.boolean().default(false),
      })
      .strict(),
    referenceClaims: z.array(claimSchema).min(1),
  })
  .strict();

const identitySchema = z
  .object({
    source: signalSourceSchema,
    handle: z.string().min(2),
    url: z.string().startsWith("synthetic://"),
    matchConfidence: z.number().min(0).max(1),
  })
  .strict();

export const syntheticProfileSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    profileId: z.string().regex(/^syn-[0-9]{3}$/),
    synthetic: z.literal(true),
    archetype: z.enum(ARCHETYPES),
    founder: z
      .object({
        name: z.string().min(3),
        email: z.string().email().endsWith(".example.invalid"),
        context: z
          .object({
            teamStatus: z.enum(["solo", "cofounders", "unknown"]),
            occupation: z.enum([
              "student",
              "employed",
              "full_time_founder",
              "researcher",
              "unknown",
            ]),
            priorFunding: z.string().min(3),
            location: z.string().min(2),
            notes: z.string().min(8),
          })
          .strict(),
      })
      .strict(),
    company: z
      .object({
        name: z.string().min(3),
        oneLiner: z.string().min(12),
        sector: z.string().min(2),
        stage: z.enum(["idea", "pre-seed", "seed"]),
        geography: z.string().min(2),
      })
      .strict(),
    opportunity: z
      .object({
        track: z.enum(["INBOUND", "OUTBOUND"]),
        firstSignalAt: z.string().datetime(),
      })
      .strict(),
    identities: z.array(identitySchema),
    signals: z.array(signalSchema).min(1),
  })
  .strict();

export type SyntheticProfile = z.infer<typeof syntheticProfileSchema>;

export interface CorpusSummary {
  profiles: number;
  decks: number;
  signals: number;
  claims: number;
  contradictionCases: number;
  archetypes: Record<(typeof ARCHETYPES)[number], number>;
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function validateCorpus(input: unknown[]): {
  profiles: SyntheticProfile[];
  summary: CorpusSummary;
} {
  const profiles = input.map((profile, index) => {
    const result = syntheticProfileSchema.safeParse(profile);
    if (!result.success) {
      throw new Error(`Profile row ${index + 1} is invalid: ${z.prettifyError(result.error)}`);
    }
    return result.data;
  });

  if (profiles.length !== 36) {
    throw new Error(`Expected 36 profiles, received ${profiles.length}`);
  }

  const profileIds = profiles.map((profile) => profile.profileId);
  const emails = profiles.map((profile) => profile.founder.email);
  const companyNames = profiles.map((profile) => profile.company.name.toLowerCase());
  const signals = profiles.flatMap((profile) => profile.signals);
  const signalIds = signals.map((signal) => signal.signalId);
  const ingestionKeys = signals.map((signal) => signal.meta.ingestionKey);

  const uniqueChecks: Array<[string, string[]]> = [
    ["profile IDs", profileIds],
    ["founder emails", emails],
    ["company names", companyNames],
    ["signal IDs", signalIds],
    ["ingestion keys", ingestionKeys],
  ];
  for (const [label, values] of uniqueChecks) {
    const duplicates = duplicateValues(values);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate ${label}: ${duplicates.join(", ")}`);
    }
  }

  const archetypes = Object.fromEntries(ARCHETYPES.map((key) => [key, 0])) as CorpusSummary["archetypes"];
  for (const profile of profiles) archetypes[profile.archetype] += 1;
  for (const archetype of ARCHETYPES) {
    if (archetypes[archetype] !== EXPECTED_ARCHETYPE_COUNTS[archetype]) {
      throw new Error(
        `Expected ${EXPECTED_ARCHETYPE_COUNTS[archetype]} ${archetype} profiles, received ${archetypes[archetype]}`,
      );
    }
  }

  const deckSignals = signals.filter((signal) => signal.source === "DECK");
  if (deckSignals.length !== 10) {
    throw new Error(`Expected 10 deck signals, received ${deckSignals.length}`);
  }
  for (const deck of deckSignals) {
    if (!/Slide\s+\d+:/i.test(deck.rawContent)) {
      throw new Error(`Deck ${deck.signalId} has no slide markers`);
    }
  }

  const contradictionRoles = new Map<string, Set<string>>();
  for (const signal of signals) {
    if (!signal.contradiction) continue;
    const roles = contradictionRoles.get(signal.contradiction.caseId) ?? new Set<string>();
    roles.add(signal.contradiction.role);
    contradictionRoles.set(signal.contradiction.caseId, roles);
  }
  if (contradictionRoles.size !== 4) {
    throw new Error(`Expected 4 contradiction cases, received ${contradictionRoles.size}`);
  }
  for (const [caseId, roles] of contradictionRoles) {
    if (!roles.has("assertion") || !roles.has("counter_evidence")) {
      throw new Error(`${caseId} must contain assertion and counter_evidence signals`);
    }
  }

  return {
    profiles,
    summary: {
      profiles: profiles.length,
      decks: deckSignals.length,
      signals: signals.length,
      claims: signals.reduce((count, signal) => count + signal.referenceClaims.length, 0),
      contradictionCases: contradictionRoles.size,
      archetypes,
    },
  };
}

export async function loadCorpus(
  filePath = resolve(process.cwd(), "data", "track-a", "profiles.jsonl"),
): Promise<unknown[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as unknown;
      } catch (error) {
        throw new Error(`Invalid JSON on line ${index + 1}: ${String(error)}`);
      }
    });
}
