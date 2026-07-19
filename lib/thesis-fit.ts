/** Graded thesis fit for list views: sector match 60% + geography match 40%. */
export function thesisFitPct(
  sector: string | null | undefined,
  geography: string | null | undefined,
  thesis: { sectors?: string[]; geographies?: string[] } | null | undefined
): number {
  if (!thesis) return 0;
  const s = (sector ?? "").toLowerCase();
  const g = (geography ?? "").toLowerCase();
  const hit = (value: string, list: string[] | undefined) =>
    value !== "" &&
    (list ?? []).some((t) => {
      const tl = t.toLowerCase();
      return value.includes(tl) || tl.includes(value);
    });
  return (hit(s, thesis.sectors) ? 60 : 0) + (hit(g, thesis.geographies) ? 40 : 0);
}
