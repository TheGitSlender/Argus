/** Shared test fixtures: hand-built evidence bundles mirroring the seed personas. */
import type { EvidenceBundle } from "../lib/intel/evidence";

export const amara: EvidenceBundle = {
  founder: {
    id: "amara-test",
    name: "Amara Diallo",
    context: {
      teamStatus: "solo",
      occupation: "employed",
      priorFunding: "none known",
      location: "Berlin",
      notes: "Warehouse ops engineer building CV tooling nights/weekends.",
    },
  },
  signals: [
    {
      id: "sig-gh-1",
      source: "GITHUB",
      sourceUrl: "https://github.com/amaradiallo/warehouse-cv",
      rawContent:
        "Repo warehouse-cv: 14 months of consistent commits, custom detection head replacing YOLO in March with benchmarked tradeoffs, deployed at 2 pilot warehouses. 11 stars.",
      occurredAt: new Date("2026-06-20"),
      meta: { stars: 11, followers: 40, commitCadence: "steady", finishedProjects: 3 },
    },
    {
      id: "sig-blog-1",
      source: "BLOG",
      rawContent:
        "Technical blog post: 'Why we measured 22% better recall after replacing YOLO' — walks through the failure modes on reflective packaging and the custom head design.",
      occurredAt: new Date("2026-05-02"),
    },
  ],
  claims: [
    {
      id: "clm-1",
      text: "Custom detection head outperforms YOLO baseline by 22% on their warehouse dataset",
      category: "technology",
      sourceLocation: "README benchmarks",
      specificity: "high",
      verificationStatus: "VERIFIED",
      trustScore: 0.8,
    },
    {
      id: "clm-2",
      text: "Deployed at 2 pilot warehouses since April",
      category: "traction",
      sourceLocation: "README",
      specificity: "medium",
      verificationStatus: "UNVERIFIED",
      trustScore: 0.55,
    },
  ],
};

/** The hype case: high visibility, low evidence density — must rank DOWN. */
export const maxwell: EvidenceBundle = {
  founder: {
    id: "maxwell-test",
    name: "Maxwell Sterling",
    context: {
      teamStatus: "cofounders",
      occupation: "full_time_founder",
      priorFunding: "$500K angel round 2025",
      location: "San Francisco",
      notes: "Ex-FAANG PM, 40K followers.",
    },
  },
  signals: [
    {
      id: "sig-mx-gh",
      source: "GITHUB",
      sourceUrl: "https://github.com/maxsterling/agi-in-a-box",
      rawContent:
        "Repo agi-in-a-box: 4.2K stars from a viral launch tweet, 9 commits total, last commit 7 months ago, README-only architecture promising 'the operating system for AGI agents'.",
      occurredAt: new Date("2025-12-01"),
      meta: { stars: 4200, followers: 40000, commitCadence: "abandoned", finishedProjects: 0 },
    },
    {
      id: "sig-mx-tw",
      source: "WEB",
      rawContent:
        "Thread (2.1M views): 'We're building the future of autonomous intelligence. Revolutionary. Unprecedented. DM for early access.' No product link, no demo, no dates.",
      occurredAt: new Date("2026-05-15"),
      meta: { pressMentions: 3 },
    },
  ],
  claims: [
    {
      id: "clm-mx-1",
      text: "Building the operating system for AGI agents",
      category: "product",
      sourceLocation: "README",
      specificity: "low",
      verificationStatus: "UNVERIFIED",
      trustScore: 0.25,
    },
  ],
};

export const priya: EvidenceBundle = {
  founder: {
    id: "priya-test",
    name: "Priya Raghavan",
    context: { teamStatus: "cofounders", occupation: "full_time_founder", priorFunding: "none known", location: "London" },
  },
  signals: [
    {
      id: "sig-deck-1",
      source: "DECK",
      rawContent: "Pitch deck: ShipMetrics, logistics analytics. Slide 9 claims $40K MRR and 30 enterprise customers.",
      occurredAt: new Date("2026-07-10"),
    },
    {
      id: "sig-ph-1",
      source: "PRODUCT_HUNT",
      sourceUrl: "https://producthunt.com/posts/shipmetrics",
      rawContent: "Product Hunt launch post dated 2026-06-27: 'Today we're launching ShipMetrics into public beta!'",
      occurredAt: new Date("2026-06-27"),
    },
  ],
  claims: [
    {
      id: "clm-mrr",
      text: "$40K MRR with 30 enterprise customers",
      category: "revenue",
      sourceLocation: "slide 9",
      specificity: "high",
      verificationStatus: "UNVERIFIED",
    },
  ],
};
