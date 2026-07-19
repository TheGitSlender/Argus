import assert from "node:assert/strict";
import test from "node:test";
import { SignalSource } from "@prisma/client";
import {
  normalizeEntityText,
  resolveCandidate,
  type EntityCandidate,
  type ResolverFounder,
} from "./entity-resolution";

const founders: ResolverFounder[] = [
  {
    id: "founder-amina",
    name: "Amina Kader",
    email: "amina@docklens.example.invalid",
    location: "Tangier, Morocco",
    companies: ["DockLens"],
    identities: [{ source: SignalSource.GITHUB, handle: "amina-docklens" }],
  },
  {
    id: "founder-jakub",
    name: "Jakub Nowak",
    email: "jakub@queryforge.example.invalid",
    location: "Krakow, Poland",
    companies: ["QueryForge"],
    identities: [{ source: SignalSource.GITHUB, handle: "jnowak-queryforge" }],
  },
];

function candidate(overrides: Partial<EntityCandidate>): EntityCandidate {
  return {
    candidateId: "candidate-test",
    name: "Amina Kader",
    identities: [],
    ...overrides,
  };
}

test("normalizes accents, punctuation, and whitespace", () => {
  assert.equal(normalizeEntityText("  Amína-Kader  "), "amina kader");
});

test("auto-links an exact email", () => {
  const result = resolveCandidate(
    candidate({ email: "AMINA@DOCKLENS.EXAMPLE.INVALID" }),
    founders,
  );
  assert.equal(result.status, "linked");
  assert.equal(result.founderId, "founder-amina");
  assert.equal(result.confidence, 1);
});

test("auto-links an exact source and handle", () => {
  const result = resolveCandidate(
    candidate({
      name: "Different spelling",
      identities: [
        {
          source: "GITHUB",
          handle: "amina-docklens",
          url: "synthetic://identity/github/amina-docklens",
        },
      ],
    }),
    founders,
  );
  assert.equal(result.status, "linked");
  assert.equal(result.founderId, "founder-amina");
  assert.equal(result.confidence, 0.98);
});

test("sends name plus company/location to review without linking", () => {
  const result = resolveCandidate(
    candidate({ companyName: "DockLens", location: "Tangier, Morocco" }),
    founders,
  );
  assert.equal(result.status, "review");
  assert.equal(result.founderId, "founder-amina");
  assert.equal(result.confidence, 0.94);
});

test("rejects conflicting exact identifiers", () => {
  const result = resolveCandidate(
    candidate({
      email: "amina@docklens.example.invalid",
      identities: [
        {
          source: "GITHUB",
          handle: "jnowak-queryforge",
          url: "synthetic://identity/github/jnowak-queryforge",
        },
      ],
    }),
    founders,
  );
  assert.equal(result.status, "conflict");
  assert.equal(result.founderId, null);
});

test("does not merge ambiguous homonyms", () => {
  const homonyms: ResolverFounder[] = [
    { ...founders[0], id: "founder-amina-one", email: null, identities: [] },
    { ...founders[0], id: "founder-amina-two", email: null, identities: [] },
  ];
  const result = resolveCandidate(
    candidate({ companyName: "DockLens", location: "Tangier, Morocco" }),
    homonyms,
  );
  assert.equal(result.status, "unresolved");
  assert.match(result.reason, /Ambiguous/);
});

test("keeps a name-only match below review threshold", () => {
  const result = resolveCandidate(candidate({}), founders);
  assert.equal(result.status, "unresolved");
  assert.equal(result.confidence, 0.65);
});
