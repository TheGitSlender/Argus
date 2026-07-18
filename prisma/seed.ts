import { PrismaClient, SignalSource, Track, Axis, Trend, Dimension } from "@prisma/client";

const prisma = new PrismaClient();

// Hand-written starter corpus so the UI track has real-shaped data on day one.
// Track A replaces/extends this with the full 30-40 profile synthetic corpus.

const band = (value: number, low: number, high: number, coverage?: number) => ({
  value,
  low,
  high,
  ...(coverage !== undefined ? { coverage } : {}),
});

async function main() {
  // Idempotent-ish for dev: wipe in FK-safe order. Fine before we have real data.
  await prisma.$transaction([
    prisma.reasoningLog.deleteMany(),
    prisma.interviewQuestion.deleteMany(),
    prisma.axisScore.deleteMany(),
    prisma.claim.deleteMany(),
    prisma.scoreHistory.deleteMany(),
    prisma.signal.deleteMany(),
    prisma.opportunityFounder.deleteMany(),
    prisma.opportunity.deleteMany(),
    prisma.company.deleteMany(),
    prisma.identity.deleteMany(),
    prisma.founderScore.deleteMany(),
    prisma.founder.deleteMany(),
    prisma.thesis.deleteMany(),
  ]);

  await prisma.thesis.create({
    data: {
      name: "Maschmeyer AI Seed Thesis",
      sectors: ["ai-infra", "devtools", "applied-ai"],
      stages: ["pre-seed", "seed"],
      geographies: ["Europe", "North America"],
      checkSizeUsd: 100_000,
      ownershipTargetPct: 7,
      riskAppetite: "aggressive",
    },
  });

  // --- 1. The hidden gem: high capability, low visibility (demo protagonist) --
  const amara = await prisma.founder.create({
    data: {
      name: "Amara Diallo",
      email: "amara@warehouse-cv.dev",
      context: {
        teamStatus: "solo",
        occupation: "employed",
        priorFunding: "none known",
        location: "Berlin",
        notes: "Warehouse ops engineer building CV tooling nights/weekends.",
      },
      identities: {
        create: [
          { source: SignalSource.GITHUB, handle: "amaradiallo", url: "https://github.com/amaradiallo", matchConfidence: 0.97 },
        ],
      },
      score: {
        create: {
          execution: band(78, 70, 86, 0.7),
          technicalDepth: band(82, 74, 89, 0.75),
          problemInsight: band(74, 64, 83, 0.6),
          resourcefulness: band(85, 78, 91, 0.7),
          momentum: band(71, 60, 82, 0.5),
          composite: band(78, 70, 86),
          visibilityIndex: 18,
          capabilityVisibilityGap: 60,
        },
      },
    },
  });

  const amaraSignal = await prisma.signal.create({
    data: {
      founderId: amara.id,
      source: SignalSource.GITHUB,
      sourceUrl: "https://github.com/amaradiallo/warehouse-cv",
      rawContent:
        "Repo warehouse-cv: 14 months of consistent commits, custom detection head replacing YOLO in March, deployed at 2 pilot warehouses. 11 stars.",
      occurredAt: new Date("2026-06-20"),
      meta: { stars: 11, commitCadence: "steady", finishedProjects: 3 },
    },
  });

  await prisma.claim.createMany({
    data: [
      {
        signalId: amaraSignal.id,
        text: "Custom detection head outperforms YOLO baseline by 22% on their warehouse dataset",
        category: "TECHNOLOGY",
        sourceLocation: "README benchmarks section",
        specificity: "high",
        trustScore: 0.8,
        verificationStatus: "VERIFIED",
      },
      {
        signalId: amaraSignal.id,
        text: "Deployed at 2 pilot warehouses since April",
        category: "TRACTION",
        sourceLocation: "README",
        specificity: "medium",
        trustScore: 0.55,
        verificationStatus: "UNVERIFIED",
      },
    ],
  });

  await prisma.scoreHistory.create({
    data: {
      founderId: amara.id,
      dimension: Dimension.TECHNICAL_DEPTH,
      oldBand: band(74, 62, 85),
      newBand: band(82, 74, 89),
      causeSignalId: amaraSignal.id,
      rationale: "Custom detection head with measured tradeoffs raises depth estimate and narrows the band.",
    },
  });

  await prisma.interviewQuestion.create({
    data: {
      founderId: amara.id,
      targetDimension: Dimension.PROBLEM_INSIGHT,
      question:
        "Her repo switched from YOLO to a custom detection head in March — ask why, and what she measured before committing to the rewrite.",
      strongAnswerSignature: "Names a measured tradeoff (latency/accuracy on their data) and the experiment that settled it.",
      redFlagSignature: "Vague appeal to 'YOLO wasn't good enough' with no numbers — suggests tutorial-following.",
      expectedBandReduction: "resolves Problem Insight band from ±10 to ~±4",
    },
  });

  const amaraCo = await prisma.company.create({
    data: { name: "WarehouseCV", oneLiner: "Computer vision for mid-size warehouse ops", sector: "applied-ai", stage: "pre-seed", geography: "Europe" },
  });
  await prisma.opportunity.create({
    data: {
      companyId: amaraCo.id,
      track: Track.OUTBOUND,
      status: "DILIGENCE",
      firstSignalAt: new Date("2026-07-15T09:00:00Z"),
      founders: { create: [{ founderId: amara.id }] },
      axisScores: {
        create: [
          { axis: Axis.FOUNDER, value: 79, trend: Trend.IMPROVING, rationale: "Strong evidence density, resourceful solo execution.", citedClaimIds: [] },
          { axis: Axis.MARKET, value: 62, trend: Trend.STABLE, rationale: "Mid-market warehouse CV is real but fragmented.", citedClaimIds: [] },
          { axis: Axis.IDEA_VS_MARKET, value: 68, trend: Trend.IMPROVING, rationale: "Wedge survives scrutiny; pilot pull suggests pivot-resilience.", citedClaimIds: [] },
        ],
      },
    },
  });

  // --- 2. The hype case: high visibility, low capability ---------------------
  const chad = await prisma.founder.create({
    data: {
      name: "Maxwell Sterling",
      email: "max@stealthagi.io",
      context: {
        teamStatus: "cofounders",
        occupation: "full_time_founder",
        priorFunding: "$500K angel round 2025",
        location: "San Francisco",
        notes: "Ex-FAANG PM, 40K followers, one viral but abandoned repo.",
      },
      score: {
        create: {
          execution: band(38, 28, 49, 0.6),
          technicalDepth: band(31, 22, 42, 0.55),
          problemInsight: band(45, 34, 56, 0.5),
          resourcefulness: band(29, 20, 40, 0.6),
          momentum: band(35, 24, 47, 0.5),
          composite: band(36, 27, 47),
          visibilityIndex: 88,
          capabilityVisibilityGap: -52,
        },
      },
    },
  });
  const chadSignal = await prisma.signal.create({
    data: {
      founderId: chad.id,
      source: SignalSource.GITHUB,
      sourceUrl: "https://github.com/maxsterling/agi-in-a-box",
      rawContent: "Repo agi-in-a-box: 4.2K stars from a viral launch tweet, 9 commits total, last commit 7 months ago, README-only architecture.",
      occurredAt: new Date("2025-12-01"),
      meta: { stars: 4200, commitCadence: "abandoned", finishedProjects: 0 },
    },
  });
  await prisma.claim.create({
    data: {
      signalId: chadSignal.id,
      text: "Building AGI-powered agent platform (no working code in repo)",
      category: "PRODUCT",
      sourceLocation: "README",
      specificity: "low",
      trustScore: 0.25,
      verificationStatus: "UNVERIFIED",
    },
  });

  // --- 3. The inflated claimer: seeded contradiction (Validator demo) --------
  const priya = await prisma.founder.create({
    data: {
      name: "Priya Raghavan",
      email: "priya@shipmetrics.co",
      context: { teamStatus: "cofounders", occupation: "full_time_founder", priorFunding: "none known", location: "London" },
      score: {
        create: {
          execution: band(58, 46, 69, 0.5),
          technicalDepth: band(61, 50, 71, 0.55),
          problemInsight: band(52, 38, 66, 0.4),
          resourcefulness: band(55, 44, 67, 0.5),
          momentum: band(60, 47, 72, 0.45),
          composite: band(57, 45, 69),
          visibilityIndex: 44,
          capabilityVisibilityGap: 13,
        },
      },
    },
  });
  const priyaDeck = await prisma.signal.create({
    data: {
      founderId: priya.id,
      source: SignalSource.DECK,
      rawContent: "Pitch deck: ShipMetrics, logistics analytics. Slide 9 claims $40K MRR and 30 enterprise customers.",
      occurredAt: new Date("2026-07-10"),
    },
  });
  const priyaWeb = await prisma.signal.create({
    data: {
      founderId: priya.id,
      source: SignalSource.PRODUCT_HUNT,
      sourceUrl: "https://producthunt.com/posts/shipmetrics",
      rawContent: "Product Hunt launch post dated 3 weeks ago: 'Today we're launching ShipMetrics into public beta!'",
      occurredAt: new Date("2026-06-27"),
    },
  });
  await prisma.claim.create({
    data: {
      signalId: priyaDeck.id,
      text: "$40K MRR with 30 enterprise customers",
      category: "REVENUE",
      sourceLocation: "slide 9",
      specificity: "high",
      trustScore: 0.15,
      verificationStatus: "CONTRADICTED",
      evidenceRefs: { contradictingSignalIds: [priyaWeb.id], note: "Product launched into public beta 3 weeks ago per Product Hunt — $40K MRR implausible." },
    },
  });

  // --- 4. The pure cold-start student: deck only, wide honest bands ----------
  const tomas = await prisma.founder.create({
    data: {
      name: "Tomás Rivera",
      email: "tomas@campuscartel.app",
      context: { teamStatus: "solo", occupation: "student", priorFunding: "none known", location: "Madrid", notes: "Second-year CS student, first application anywhere." },
      score: {
        create: {
          execution: band(51, 30, 72, 0.2),
          technicalDepth: band(48, 26, 70, 0.2),
          problemInsight: band(64, 46, 81, 0.3),
          resourcefulness: band(59, 38, 79, 0.25),
          momentum: band(50, 28, 71, 0.15),
          composite: band(54, 33, 75),
          visibilityIndex: 6,
          capabilityVisibilityGap: 48,
        },
      },
    },
  });
  const tomasDeck = await prisma.signal.create({
    data: {
      founderId: tomas.id,
      source: SignalSource.DECK,
      rawContent:
        "Deck: campus food-sharing app. Slide 4: interviewed 23 students across 3 dorms, 17 said they throw out food weekly. Slide 6: waitlist of 140 from one flyer campaign.",
      occurredAt: new Date("2026-07-16"),
    },
  });
  await prisma.claim.createMany({
    data: [
      {
        signalId: tomasDeck.id,
        text: "Interviewed 23 students across 3 dorms; 17 report weekly food waste",
        category: "MARKET",
        sourceLocation: "slide 4",
        specificity: "high",
        trustScore: 0.6,
        verificationStatus: "UNVERIFIED",
      },
      {
        signalId: tomasDeck.id,
        text: "140-person waitlist from one flyer campaign",
        category: "TRACTION",
        sourceLocation: "slide 6",
        specificity: "medium",
        trustScore: 0.5,
        verificationStatus: "UNVERIFIED",
      },
    ],
  });
  await prisma.interviewQuestion.create({
    data: {
      founderId: tomas.id,
      targetDimension: Dimension.EXECUTION,
      question: "The deck mentions a waitlist of 140 — ask what he has actually built so far, and what the last thing he shipped end-to-end was.",
      strongAnswerSignature: "Describes a working prototype or prior finished project with concrete details, even a class project.",
      redFlagSignature: "Everything is 'planned for next semester'; no artifact of any kind exists.",
      expectedBandReduction: "resolves Execution band from ±21 to ~±8",
    },
  });
  const tomasCo = await prisma.company.create({
    data: { name: "CampusCartel", oneLiner: "Dorm-to-dorm food sharing", sector: "consumer", stage: "pre-seed", geography: "Europe" },
  });
  await prisma.opportunity.create({
    data: {
      companyId: tomasCo.id,
      track: Track.INBOUND,
      status: "SCREENED",
      firstSignalAt: new Date("2026-07-16T14:00:00Z"),
      founders: { create: [{ founderId: tomas.id }] },
    },
  });

  console.log("Seeded: 4 founders, 1 thesis, signals/claims/history for demo personas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
