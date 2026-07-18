import type { EvidenceBundle } from "./evidence";

// =============================================================================
// Visibility Index: 0-100 DISCOVERABILITY. Deterministic formula over counts.
// Used ONLY for the capability-visibility gap and Hidden Gems ranking.
// It must never feed the capability dimensions — that separation is the thesis.
// =============================================================================

export interface VisibilityInputs {
  followers: number;
  stars: number;
  pressMentions: number;
  launchUpvotes: number;
  acceleratorTier: "top" | "other" | null;
  priorVcBacking: boolean;
}

const log10 = (x: number) => Math.log10(1 + Math.max(0, x));

/** Log-scaled components so 40K followers doesn't dominate linearly. */
export function computeVisibilityIndex(v: VisibilityInputs): number {
  const followers = Math.min(30, (30 * log10(v.followers)) / 5); // caps at 100K
  const stars = Math.min(25, (25 * log10(v.stars)) / 4); // caps at 10K
  const press = Math.min(15, v.pressMentions * 5);
  const upvotes = Math.min(5, (5 * log10(v.launchUpvotes)) / 3);
  const accelerator = v.acceleratorTier === "top" ? 15 : v.acceleratorTier === "other" ? 7 : 0;
  const vc = v.priorVcBacking ? 10 : 0;
  const total = followers + stars + press + upvotes + accelerator + vc;
  return Math.round(Math.min(100, total) * 10) / 10;
}

/** Pull visibility inputs out of signal meta + founder context. */
export function deriveVisibilityInputs(bundle: EvidenceBundle): VisibilityInputs {
  let followers = 0;
  let stars = 0;
  let pressMentions = 0;
  let launchUpvotes = 0;
  let acceleratorTier: VisibilityInputs["acceleratorTier"] = null;

  for (const s of bundle.signals) {
    const meta = (s.meta ?? {}) as Record<string, unknown>;
    if (typeof meta.followers === "number") followers = Math.max(followers, meta.followers);
    if (typeof meta.stars === "number") stars = Math.max(stars, meta.stars);
    if (typeof meta.pressMentions === "number") pressMentions += meta.pressMentions;
    if (typeof meta.upvotes === "number") launchUpvotes = Math.max(launchUpvotes, meta.upvotes);
    if (meta.acceleratorTier === "top") acceleratorTier = "top";
    else if (meta.acceleratorTier === "other" && acceleratorTier === null) acceleratorTier = "other";
  }

  const priorFunding = bundle.founder.context.priorFunding.toLowerCase();
  const priorVcBacking =
    priorFunding !== "" && !priorFunding.includes("none") && !priorFunding.includes("unknown");

  return { followers, stars, pressMentions, launchUpvotes, acceleratorTier, priorVcBacking };
}
