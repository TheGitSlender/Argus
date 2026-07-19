"use client";

interface DataPoint {
  id: string;
  name: string;
  company: string;
  visibility: number;
  capability: number;
}

interface ScatterChartProps {
  data: DataPoint[];
}

export default function ScatterChart({ data }: ScatterChartProps) {
  const width = 480;
  const height = 320;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const xTicks = [0, 25, 50, 75, 100];
  const yTicks = [0, 25, 50, 75, 100];

  const toX = (v: number) => padding.left + (v / 100) * plotW;
  const toY = (v: number) => padding.top + plotH - (v / 100) * plotH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      {/* Grid lines */}
      {xTicks.map((t) => (
        <line key={`x-${t}`} x1={toX(t)} y1={padding.top} x2={toX(t)} y2={padding.top + plotH}
          stroke="var(--color-divider)" strokeWidth="1" />
      ))}
      {yTicks.map((t) => (
        <line key={`y-${t}`} x1={padding.left} y1={toY(t)} x2={padding.left + plotW} y2={toY(t)}
          stroke="var(--color-divider)" strokeWidth="1" />
      ))}

      {/* Axes */}
      <line x1={padding.left} y1={padding.top + plotH} x2={padding.left + plotW} y2={padding.top + plotH}
        stroke="var(--color-text)" strokeWidth="1" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotH}
        stroke="var(--color-text)" strokeWidth="1" />

      {/* Axis labels */}
      {xTicks.map((t) => (
        <text key={`xl-${t}`} x={toX(t)} y={padding.top + plotH + 20}
          textAnchor="middle" fill="var(--color-text)" fontSize="10" opacity="0.6">{t}</text>
      ))}
      {yTicks.map((t) => (
        <text key={`yl-${t}`} x={padding.left - 8} y={toY(t) + 4}
          textAnchor="end" fill="var(--color-text)" fontSize="10" opacity="0.6">{t}</text>
      ))}

      {/* Axis titles */}
      <text x={padding.left + plotW / 2} y={height - 4}
        textAnchor="middle" fill="var(--color-text)" fontSize="11" opacity="0.5">Visibility</text>
      <text x={10} y={padding.top + plotH / 2}
        textAnchor="middle" fill="var(--color-text)" fontSize="11" opacity="0.5"
        transform={`rotate(-90, 10, ${padding.top + plotH / 2})`}>Capability</text>

      {/* Data points */}
      {data.map((d) => {
        const isHiddenGem = d.capability - d.visibility > 30;
        return (
          <g key={d.id}>
            <circle
              cx={toX(d.visibility)}
              cy={toY(d.capability)}
              r={6}
              fill={isHiddenGem ? "var(--color-accent-2)" : "var(--color-accent)"}
              opacity="0.85"
            />
            <text
              x={toX(d.visibility) + 10}
              y={toY(d.capability) + 4}
              fill="var(--color-text)"
              fontSize="10"
              opacity="0.7"
            >
              {d.name}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <circle cx={padding.left + 10} cy={padding.top - 8} r={4} fill="var(--color-accent-2)" />
      <text x={padding.left + 20} y={padding.top - 4} fill="var(--color-text)" fontSize="10" opacity="0.6">Hidden gem</text>
      <circle cx={padding.left + 100} cy={padding.top - 8} r={4} fill="var(--color-accent)" />
      <text x={padding.left + 110} y={padding.top - 4} fill="var(--color-text)" fontSize="10" opacity="0.6">Tracked</text>
    </svg>
  );
}
