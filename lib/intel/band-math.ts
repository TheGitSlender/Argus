import type { ScoreBand } from "../contracts";

// Pure band arithmetic — no LLM, no DB. Unit-testable in isolation.

export function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Band from self-consistency samples:
 * value = median; raw band = [min, max] (epistemic spread across runs);
 * then widened by evidence coverage: width *= (1 + k * (1 - coverage)).
 * A minimum half-width stops identical samples from implying false certainty.
 */
export function bandFromSamples(
  samples: number[],
  coverage: number,
  { k = 0.5, minHalfWidth = 3 }: { k?: number; minHalfWidth?: number } = {}
): ScoreBand {
  if (samples.length === 0) throw new Error("bandFromSamples: no samples");
  const value = median(samples);
  const widen = 1 + k * (1 - clamp(coverage, 0, 1));
  const lowHalf = Math.max((value - Math.min(...samples)) * widen, minHalfWidth * widen);
  const highHalf = Math.max((Math.max(...samples) - value) * widen, minHalfWidth * widen);
  return {
    value: round1(value),
    low: round1(clamp(value - lowHalf)),
    high: round1(clamp(value + highHalf)),
    coverage: clamp(coverage, 0, 1),
  };
}

/** Equal-weight composite; bounds aggregate the per-dimension bounds. */
export function compositeBand(bands: ScoreBand[]): ScoreBand {
  if (bands.length === 0) throw new Error("compositeBand: no bands");
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    value: round1(mean(bands.map((b) => b.value))),
    low: round1(mean(bands.map((b) => b.low))),
    high: round1(mean(bands.map((b) => b.high))),
    coverage: round1(mean(bands.map((b) => b.coverage ?? 0.5)) * 100) / 100,
  };
}

export function bandWidth(b: ScoreBand): number {
  return b.high - b.low;
}

/**
 * Where the point estimate sits within the band: 0 = at low edge,
 * 0.5 = centred, 1 = at high edge.  Useful for distinguishing "we're
 * confident this is high" from "we're uncertain and the median happens
 * to be high."
 */
export function medianIndex(b: ScoreBand): number {
  const w = b.high - b.low;
  if (w === 0) return 0.5;
  return Math.round(((b.value - b.low) / w) * 100) / 100;
}
