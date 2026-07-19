/**
 * Unit tests for pure-logic intelligence functions. No DB, no LLM, $0 cost.
 * Run: npm run test:unit
 */
import { median, bandFromSamples, compositeBand, bandWidth, medianIndex } from "../lib/intel/band-math";
import { computeVisibilityIndex, parseVisibilityFromText } from "../lib/intel/visibility";
import { computeCoverage, type EvidenceBundle } from "../lib/intel/evidence";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function approxEqual(a: number, b: number, tolerance: number, label: string) {
  const ok = Math.abs(a - b) <= tolerance;
  if (!ok) failed++;
  else passed++;
  if (!ok) console.error(`  FAIL: ${label} — expected ${b} ± ${tolerance}, got ${a}`);
}

function hr(title: string) {
  console.log(`\n--- ${title} ---`);
}

// =============================================================================
// band-math.ts
// =============================================================================

hr("median");

assert(median([70]) === 70, "single element");
assert(median([70, 80]) === 75, "two elements");
assert(median([70, 80, 90]) === 80, "three elements");
assert(median([60, 70, 80, 90]) === 75, "four elements (avg of middles)");
assert(median([50, 60, 70, 80, 90, 100]) === 75, "six elements");
assert(median([30, 30, 30]) === 30, "all same");

hr("bandFromSamples — identical samples");

{
  const b1 = bandFromSamples([70, 70, 70], 1);
  assert(b1.value === 70, "value=70", `got ${b1.value}`);
  approxEqual(b1.low, 67, 0.1, "coverage=1 → low=67");
  approxEqual(b1.high, 73, 0.1, "coverage=1 → high=73");
}

{
  const b0 = bandFromSamples([70, 70, 70], 0);
  assert(b0.value === 70, "value=70 at coverage=0", `got ${b0.value}`);
  approxEqual(b0.low, 65.5, 0.1, "coverage=0 → low=65.5 (wider)");
  approxEqual(b0.high, 74.5, 0.1, "coverage=0 → high=74.5 (wider)");
}

assert(
  bandWidth(bandFromSamples([70, 70, 70], 0)) > bandWidth(bandFromSamples([70, 70, 70], 1)),
  "coverage=0 band is wider than coverage=1"
);

hr("bandFromSamples — spread samples");

{
  const b = bandFromSamples([60, 75, 80], 0.9);
  // median=75, widen=1.05, lowHalf=max(15*1.05, 3*1.05)=15.75, highHalf=max(5*1.05, 3*1.05)=5.25
  assert(b.value === 75, "value=75", `got ${b.value}`);
  approxEqual(b.low, 59.3, 0.1, "low≈59.3");
  approxEqual(b.high, 80.3, 0.1, "high≈80.3");
}

{
  const b = bandFromSamples([60, 75, 80], 0.2);
  // widen=1.4, lowHalf=max(15*1.4, 3*1.4)=21, highHalf=max(5*1.4, 3*1.4)=7
  approxEqual(b.low, 54, 0.1, "coverage=0.2 → low=54");
  approxEqual(b.high, 82, 0.1, "coverage=0.2 → high=82");
}

assert(
  bandWidth(bandFromSamples([60, 75, 80], 0.2)) > bandWidth(bandFromSamples([60, 75, 80], 0.9)),
  "lower coverage → wider band for spread samples"
);

hr("bandFromSamples — edge cases");

{
  const b = bandFromSamples([70], 0.5);
  // single sample, median=70, spread=0, minHalfWidth applies
  assert(b.value === 70, "single sample value=70", `got ${b.value}`);
  approxEqual(b.low, 66.3, 0.2, "single sample low≈66.3");
  approxEqual(b.high, 73.8, 0.2, "single sample high≈73.8");
}

{
  let threw = false;
  try { bandFromSamples([], 0.5); } catch { threw = true; }
  assert(threw, "empty samples throws");
}

{
  const b = bandFromSamples([50, 50, 90], 0.5);
  assert(b.value === 50, "median=50 with outlier", `got ${b.value}`);
  assert(b.high > 80, "high extends toward outlier", `got ${b.high}`);
}

hr("compositeBand");

{
  const bands = [
    { value: 70, low: 60, high: 80, coverage: 0.5 },
    { value: 70, low: 60, high: 80, coverage: 0.5 },
    { value: 70, low: 60, high: 80, coverage: 0.5 },
    { value: 70, low: 60, high: 80, coverage: 0.5 },
    { value: 70, low: 60, high: 80, coverage: 0.5 },
  ];
  const c = compositeBand(bands);
  assert(c.value === 70, "composite value=70");
  assert(c.low === 60, "composite low=60");
  assert(c.high === 80, "composite high=80");
  assert(c.coverage === 0.5, "composite coverage=0.5");
}

{
  const bands = [
    { value: 60, low: 50, high: 70, coverage: 0.3 },
    { value: 80, low: 70, high: 90, coverage: 0.7 },
  ];
  const c = compositeBand(bands);
  assert(c.value === 70, "composite of 60+80 = 70");
  assert(c.low === 60, "composite of 50+70 / 2 = 60");
  assert(c.high === 80, "composite of 70+90 / 2 = 80");
}

{
  let threw = false;
  try { compositeBand([]); } catch { threw = true; }
  assert(threw, "empty bands throws");
}

hr("bandWidth");

assert(bandWidth({ value: 70, low: 60, high: 80 }) === 20, "basic width");
assert(bandWidth({ value: 50, low: 50, high: 50 }) === 0, "zero width");
assert(bandWidth({ value: 70, low: 0, high: 100 }) === 100, "full range");

hr("medianIndex");

approxEqual(medianIndex({ value: 50, low: 0, high: 100, coverage: 0.5 }), 0.50, 0.01, "centred → 0.50");
approxEqual(medianIndex({ value: 25, low: 0, high: 100, coverage: 0.5 }), 0.25, 0.01, "lower end → 0.25");
approxEqual(medianIndex({ value: 80, low: 0, high: 100, coverage: 0.5 }), 0.80, 0.01, "upper end → 0.80");
assert(medianIndex({ value: 50, low: 50, high: 50, coverage: 0.5 }) === 0.5, "zero-width → 0.5 (centred)");

// =============================================================================
// visibility.ts
// =============================================================================

hr("computeVisibilityIndex");

{
  const v = computeVisibilityIndex({
    followers: 40, stars: 11, pressMentions: 0, launchUpvotes: 0,
    acceleratorTier: null, priorVcBacking: false,
  });
  approxEqual(v, 16.4, 0.5, "Amara (hidden gem) ≈ 16.4");
}

{
  const v = computeVisibilityIndex({
    followers: 40000, stars: 4200, pressMentions: 3, launchUpvotes: 0,
    acceleratorTier: "other", priorVcBacking: true,
  });
  approxEqual(v, 82.3, 0.5, "Maxwell (hype) ≈ 82.3");
}

assert(
  computeVisibilityIndex({ followers: 40, stars: 11, pressMentions: 0, launchUpvotes: 0, acceleratorTier: null, priorVcBacking: false }) <
  computeVisibilityIndex({ followers: 40000, stars: 4200, pressMentions: 3, launchUpvotes: 0, acceleratorTier: "other", priorVcBacking: true }),
  "hidden gem < hype in visibility"
);

{
  const v = computeVisibilityIndex({
    followers: 0, stars: 0, pressMentions: 0, launchUpvotes: 0,
    acceleratorTier: null, priorVcBacking: false,
  });
  assert(v === 0, "zero inputs → 0");
}

{
  const v = computeVisibilityIndex({
    followers: 100000, stars: 10000, pressMentions: 10, launchUpvotes: 5000,
    acceleratorTier: "top", priorVcBacking: true,
  });
  assert(v <= 100, "max inputs → capped at 100", `got ${v}`);
}

{
  const vTop = computeVisibilityIndex({
    followers: 0, stars: 0, pressMentions: 0, launchUpvotes: 0,
    acceleratorTier: "top", priorVcBacking: false,
  });
  assert(vTop === 15, "top accelerator alone → 15", `got ${vTop}`);
}

{
  const vOther = computeVisibilityIndex({
    followers: 0, stars: 0, pressMentions: 0, launchUpvotes: 0,
    acceleratorTier: "other", priorVcBacking: false,
  });
  assert(vOther === 7, "other accelerator alone → 7", `got ${vOther}`);
}

{
  const v = computeVisibilityIndex({
    followers: 0, stars: 0, pressMentions: 0, launchUpvotes: 0,
    acceleratorTier: null, priorVcBacking: true,
  });
  assert(v === 10, "prior VC backing alone → 10", `got ${v}`);
}

hr("parseVisibilityFromText");

{
  const r = parseVisibilityFromText("She has 62,000 followers on X and 8,400 repository stars.");
  assert(r.followers === 62000, "parse 62,000 followers", `got ${r.followers}`);
  assert(r.stars === 8400, "parse 8,400 stars", `got ${r.stars}`);
}

{
  const r = parseVisibilityFromText("Featured in 5 press mentions and 12 newsletter mentions.");
  assert(r.pressMentions === 12, "parse max(5 press, 12 newsletter) = 12", `got ${r.pressMentions}`);
}

{
  const r = parseVisibilityFromText("Launched on HN with 200 upvotes and 3 reactions.");
  assert(r.launchUpvotes === 200, "parse 200 upvotes", `got ${r.launchUpvotes}`);
}

{
  const r = parseVisibilityFromText("No social proof at all in this text.");
  assert(r.followers === 0, "no followers → 0");
  assert(r.stars === 0, "no stars → 0");
}

{
  const r = parseVisibilityFromText("Twenty followers and ten press mentions.");
  assert(r.followers === 20, "word number 'twenty' → 20", `got ${r.followers}`);
  assert(r.pressMentions === 10, "word number 'ten' → 10", `got ${r.pressMentions}`);
}

{
  const r = parseVisibilityFromText("1.5K followers and 2M upvotes.");
  assert(r.followers === 1500, "1.5K followers → 1500", `got ${r.followers}`);
  assert(r.launchUpvotes === 2000000, "2M upvotes → 2000000", `got ${r.launchUpvotes}`);
}

// =============================================================================
// evidence.ts — computeCoverage
// =============================================================================

hr("computeCoverage — minimum evidence floor");

{
  const bundle: EvidenceBundle = {
    founder: { name: "Test", context: { teamStatus: "solo", occupation: "unknown", priorFunding: "none known" } },
    signals: [],
    claims: [],
  };
  assert(computeCoverage(bundle) === 0, "empty bundle → 0");
}

{
  const bundle: EvidenceBundle = {
    founder: { name: "Test", context: { teamStatus: "solo", occupation: "unknown", priorFunding: "none known" } },
    signals: [
      { id: "s1", source: "GITHUB", rawContent: "test signal" },
    ],
    claims: [],
  };
  assert(computeCoverage(bundle) <= 0.15, "1 signal → capped at 0.15", `got ${computeCoverage(bundle)}`);
}

hr("computeCoverage — full formula");

{
  const now = Date.now();
  const DAY_MS = 86_400_000;
  const recent = new Date(now - 3 * DAY_MS); // 3 days ago → recency ≈ 0.967
  const bundle: EvidenceBundle = {
    founder: { name: "Test", context: { teamStatus: "solo", occupation: "unknown", priorFunding: "none known" } },
    signals: [
      { id: "s1", source: "GITHUB", rawContent: "test", occurredAt: recent },
      { id: "s2", source: "BLOG", rawContent: "test", occurredAt: recent },
      { id: "s3", source: "WEB", rawContent: "test", occurredAt: recent },
      { id: "s4", source: "ARXIV", rawContent: "test", occurredAt: recent },
      { id: "s5", source: "PRODUCT_HUNT", rawContent: "test", occurredAt: recent },
    ],
    claims: [
      { id: "c1", text: "claim", category: "traction", verificationStatus: "VERIFIED", specificity: "high" },
      { id: "c2", text: "claim", category: "team", verificationStatus: "VERIFIED", specificity: "high" },
      { id: "c3", text: "claim", category: "market", verificationStatus: "VERIFIED", specificity: "high" },
      { id: "c4", text: "claim", category: "revenue", verificationStatus: "UNVERIFIED", specificity: "low" },
    ],
  };
  // signalCount=1, diversity=1, verified=0.75, specificity=0.75, recency≈0.967
  // 0.30 + 0.20 + 0.15 + 0.1125 + 0.145 ≈ 0.91
  approxEqual(computeCoverage(bundle), 0.91, 0.02, "5 signals, 4 sources, 3/4 verified, 3/4 high-spec, recent → ≈0.91");
}

{
  const bundle: EvidenceBundle = {
    founder: { name: "Test", context: { teamStatus: "solo", occupation: "unknown", priorFunding: "none known" } },
    signals: [
      { id: "s1", source: "GITHUB", rawContent: "test" },
      { id: "s2", source: "GITHUB", rawContent: "test" },
      { id: "s3", source: "GITHUB", rawContent: "test" },
      { id: "s4", source: "GITHUB", rawContent: "test" },
      { id: "s5", source: "GITHUB", rawContent: "test" },
    ],
    claims: [],
  };
  // signalCount=1, diversity=0.25, verified=0, specificity=0, recency=0.33
  // 0.30 + 0.05 + 0 + 0 + 0.05 ≈ 0.40
  approxEqual(computeCoverage(bundle), 0.40, 0.02, "5 signals, 1 source, 0 verified, no dates → ≈0.40");
}

hr("computeCoverage — recency decay");

{
  const now = Date.now();
  const DAY_MS = 86_400_000;
  const oldDate = new Date(now - 180 * DAY_MS); // 6 months ago → recency = 0
  const recentDate = new Date(now - 3 * DAY_MS); // 3 days ago → recency ≈ 0.967

  const makeBundle = (dates: Date[]): EvidenceBundle => ({
    founder: { name: "Test", context: { teamStatus: "solo", occupation: "unknown", priorFunding: "none known" } },
    signals: dates.map((d, i) => ({ id: `s${i}`, source: "GITHUB", rawContent: "test", occurredAt: d })),
    claims: [],
  });

  const oldCoverage = computeCoverage(makeBundle([oldDate, oldDate, oldDate]));
  const recentCoverage = computeCoverage(makeBundle([recentDate, recentDate, recentDate]));
  assert(recentCoverage > oldCoverage, "recent signals → higher coverage than old signals",
    `recent=${recentCoverage} old=${oldCoverage}`);
}

hr("computeCoverage — specificity boost");

{
  const now = Date.now();
  const recent = new Date(now - 3 * 86_400_000);
  const makeBundle = (specs: Array<"high" | "medium" | "low" | null>): EvidenceBundle => ({
    founder: { name: "Test", context: { teamStatus: "solo", occupation: "unknown", priorFunding: "none known" } },
    signals: [
      { id: "s1", source: "GITHUB", rawContent: "test", occurredAt: recent },
      { id: "s2", source: "BLOG", rawContent: "test", occurredAt: recent },
    ],
    claims: specs.map((s, i) => ({ id: `c${i}`, text: "claim", category: "other", specificity: s })),
  });

  const lowSpecCoverage = computeCoverage(makeBundle(["low", "low"]));
  const highSpecCoverage = computeCoverage(makeBundle(["high", "high"]));
  assert(highSpecCoverage > lowSpecCoverage, "high-spec claims → higher coverage",
    `high=${highSpecCoverage} low=${lowSpecCoverage}`);
}

// =============================================================================
// Summary
// =============================================================================

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED ✓");
}
