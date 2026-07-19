"use client";

import ScoreBand from "./ScoreBand";
import TrendArrow from "./TrendArrow";

interface DimensionData {
  name: string;
  color: string;
  value: number;
  low: number;
  high: number;
  trend: string;
  rationale: string;
}

interface DimensionCardProps {
  dimension: DimensionData;
}

export default function DimensionCard({ dimension: d }: DimensionCardProps) {
  return (
    <div className="card" style={{ padding: "var(--space-3)" }}>
      <div className="flex items-center gap-2" style={{ marginBottom: "var(--space-1)" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: d.color,
            flex: "none",
          }}
        />
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px" }}>
          {d.name}
        </span>
        <TrendArrow trend={d.trend} />
      </div>
      <ScoreBand value={d.value} low={d.low} high={d.high} size="sm" />
      <p className="text-muted" style={{ fontSize: "12px", marginTop: "var(--space-2)" }}>
        {d.rationale}
      </p>
    </div>
  );
}
