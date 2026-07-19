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

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, "twenty-one": 21, "twenty-two": 22, "twenty-three": 23,
  "twenty-four": 24, "twenty-five": 25, thirty: 30,
};

const NUMBER_TOKEN = `(\\d[\\d,.]*[km]?|${Object.keys(WORD_NUMBERS).join("|")})`;

function parseNumberToken(token: string): number {
  const word = WORD_NUMBERS[token.toLowerCase()];
  if (word !== undefined) return word;
  const lower = token.toLowerCase();
  const multiplier = lower.endsWith("k") ? 1_000 : lower.endsWith("m") ? 1_000_000 : 1;
  return parseFloat(token.replace(/,/g, "")) * multiplier;
}

function matchCount(text: string, nounPattern: string): number {
  const re = new RegExp(`${NUMBER_TOKEN}\\s+(?:[a-z]+\\s+){0,2}?(?:${nounPattern})`, "gi");
  let max = 0;
  for (const m of text.matchAll(re)) max = Math.max(max, parseNumberToken(m[1]));
  return max;
}

/** Fallback for signals that carry visibility counts as prose (synthetic corpus
 * snapshots, scraped bios): "62,000 followers", "8,400 repository stars". */
export function parseVisibilityFromText(text: string): Pick<VisibilityInputs, "followers" | "stars" | "pressMentions" | "launchUpvotes"> {
  return {
    followers: matchCount(text, "followers|subscribers"),
    stars: matchCount(text, "stars"),
    pressMentions: matchCount(text, "press mentions|press pieces|newsletter mentions|media mentions|speaking appearances"),
    launchUpvotes: matchCount(text, "upvotes|reactions"),
  };
}

/** Pull visibility inputs out of signal meta + founder context. Structured meta
 * numbers win; prose parsing fills in when meta carries none. */
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

    const parsed = parseVisibilityFromText(s.rawContent);
    followers = Math.max(followers, parsed.followers);
    stars = Math.max(stars, parsed.stars);
    pressMentions = Math.max(pressMentions, parsed.pressMentions);
    launchUpvotes = Math.max(launchUpvotes, parsed.launchUpvotes);
  }

  const priorFunding = bundle.founder.context.priorFunding.toLowerCase();
  const priorVcBacking =
    priorFunding !== "" && !priorFunding.includes("none") && !priorFunding.includes("unknown");

  return { followers, stars, pressMentions, launchUpvotes, acceleratorTier, priorVcBacking };
}
