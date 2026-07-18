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
