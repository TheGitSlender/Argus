"use client";

interface Dimension {
  name: string;
  value: number;
  low: number;
  high: number;
  color: string;
}

interface RadarChartProps {
  dimensions: Dimension[];
  size?: number;
}

export default function RadarChart({ dimensions, size = 240 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const levels = 5;
  const n = dimensions.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (index: number, radius: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  const valueToRadius = (v: number) => (v / 100) * maxR;

  // Build polygon points for value, low, high
  const buildPolygon = (getValue: (d: Dimension) => number) =>
    dimensions
      .map((d, i) => {
        const p = getPoint(i, valueToRadius(getValue(d)));
        return `${p.x},${p.y}`;
      })
      .join(" ");

  const valuePolygon = buildPolygon((d) => d.value);
  const lowPolygon = buildPolygon((d) => d.low);
  const highPolygon = buildPolygon((d) => d.high);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height: "auto", maxWidth: size }}>
      {/* Grid levels */}
      {Array.from({ length: levels }, (_, i) => {
        const r = ((i + 1) / levels) * maxR;
        const points = Array.from({ length: n }, (_, j) => {
          const p = getPoint(j, r);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={i} points={points} fill="none" stroke="var(--color-divider)" strokeWidth="1" />;
      })}

      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const p = getPoint(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--color-divider)" strokeWidth="1" />;
      })}

      {/* High band (lightest) */}
      <polygon points={highPolygon} fill="var(--color-accent-100)" stroke="none" opacity="0.5" />

      {/* Low band */}
      <polygon points={lowPolygon} fill="var(--color-accent-200)" stroke="none" opacity="0.5" />

      {/* Value polygon */}
      <polygon points={valuePolygon} fill="var(--color-accent)" fillOpacity="0.15" stroke="var(--color-accent)" strokeWidth="2" />

      {/* Value dots */}
      {dimensions.map((d, i) => {
        const p = getPoint(i, valueToRadius(d.value));
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill={d.color} />;
      })}

      {/* Labels */}
      {dimensions.map((d, i) => {
        const p = getPoint(i, maxR + 20);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill="var(--color-text)" fontSize="10" fontFamily="var(--font-heading)">
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}
