"use client";

interface TrendArrowProps {
  trend: string;
}

export default function TrendArrow({ trend }: TrendArrowProps) {
  const t = trend.toLowerCase();
  if (t === "improving") {
    return <span style={{ color: "var(--color-accent)" }}>&#9650;</span>;
  }
  if (t === "declining") {
    return <span style={{ color: "var(--color-accent-2)" }}>&#9660;</span>;
  }
  return <span style={{ color: "var(--color-neutral-400)" }}>&#9644;</span>;
}
