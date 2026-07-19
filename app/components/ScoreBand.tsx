"use client";

interface ScoreBandProps {
  value: number;
  low: number;
  high: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function ScoreBand({ value, low, high, size = "md", showLabel = true }: ScoreBandProps) {
  const width = high - low;
  const fillPct = Math.min((value / 100) * 100, 100);

  const sizes = {
    sm: { height: 6, valueFontSize: "14px", bandFontSize: "11px" },
    md: { height: 8, valueFontSize: "24px", bandFontSize: "12px" },
    lg: { height: 10, valueFontSize: "36px", bandFontSize: "13px" },
  };
  const s = sizes[size];

  return (
    <div>
      {showLabel && (
        <div className="flex items-baseline gap-2" style={{ marginBottom: "var(--space-1)" }}>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: s.valueFontSize }}>
            {value}
          </span>
          <span className="text-muted" style={{ fontSize: s.bandFontSize }}>
            [{low}—{high}] · width {width.toFixed(1)}
          </span>
        </div>
      )}
      <div
        style={{
          position: "relative",
          height: s.height,
          borderRadius: "var(--radius-sm)",
          background: "var(--color-neutral-200)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${low}%`,
            right: `${100 - high}%`,
            top: 0,
            bottom: 0,
            borderRadius: "var(--radius-sm)",
            background: "var(--color-accent-300)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${fillPct}%`,
            borderRadius: "var(--radius-sm)",
            background: "var(--color-accent)",
          }}
        />
      </div>
    </div>
  );
}
