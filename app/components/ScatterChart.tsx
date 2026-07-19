"use client";

import { useState } from "react";

interface DataPoint {
  id: string;
  name: string;
  company: string;
  visibility: number;
  capability: number;
}

interface ScatterChartProps {
  data: DataPoint[];
  onSelect?: (id: string) => void;
}

export default function ScatterChart({ data, onSelect }: ScatterChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const width = 480;
  const height = 260;
  const padding = { top: 14, right: 16, bottom: 36, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const ticks = [0, 25, 50, 75, 100];

  const toX = (v: number) => padding.left + (v / 100) * plotW;
  const toY = (v: number) => padding.top + plotH - (v / 100) * plotH;

  const hoveredPoint = data.find((d) => d.id === hovered);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Grid lines */}
        {ticks.map((t) => (
          <line key={`xg-${t}`} x1={toX(t)} y1={padding.top} x2={toX(t)} y2={padding.top + plotH}
            stroke="var(--color-divider)" strokeWidth="1" />
        ))}
        {ticks.map((t) => (
          <line key={`yg-${t}`} x1={padding.left} y1={toY(t)} x2={padding.left + plotW} y2={toY(t)}
            stroke="var(--color-divider)" strokeWidth="1" />
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + plotH} x2={padding.left + plotW} y2={padding.top + plotH}
          stroke="var(--color-text)" strokeWidth="1" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotH}
          stroke="var(--color-text)" strokeWidth="1" />

        {/* Axis tick labels */}
        {ticks.map((t) => (
          <text key={`xt-${t}`} x={toX(t)} y={padding.top + plotH + 16}
            textAnchor="middle" fill="var(--color-text)" fontSize="9" opacity="0.5">{t}</text>
        ))}
        {ticks.map((t) => (
          <text key={`yt-${t}`} x={padding.left - 6} y={toY(t) + 3}
            textAnchor="end" fill="var(--color-text)" fontSize="9" opacity="0.5">{t}</text>
        ))}

        {/* Axis titles */}
        <text x={padding.left + plotW / 2} y={height - 4}
          textAnchor="middle" fill="var(--color-text)" fontSize="10" opacity="0.4">Visibility</text>
        <text x={8} y={padding.top + plotH / 2}
          textAnchor="middle" fill="var(--color-text)" fontSize="10" opacity="0.4"
          transform={`rotate(-90, 8, ${padding.top + plotH / 2})`}>Capability</text>

        {/* Data points */}
        {data.map((d) => {
          const isHiddenGem = d.capability - d.visibility > 30;
          const isHovered = hovered === d.id;
          return (
            <g key={d.id}
              onMouseEnter={() => setHovered(d.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect?.(d.id)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={toX(d.visibility)}
                cy={toY(d.capability)}
                r={isHovered ? 8 : 5}
                fill={isHiddenGem ? "var(--color-accent-2)" : "var(--color-accent)"}
                opacity={hovered === null || isHovered ? 0.9 : 0.35}
                style={{ transition: "r 0.15s ease, opacity 0.15s ease" }}
              />
              {!isHovered && (
                <text
                  x={toX(d.visibility) + 8}
                  y={toY(d.capability) + 3}
                  fill="var(--color-text)"
                  fontSize="9"
                  opacity={hovered === null ? 0.55 : 0.2}
                  style={{ transition: "opacity 0.15s ease", pointerEvents: "none" }}
                >
                  {d.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div className="scatter-tooltip" style={{ position: "relative", marginTop: -8, marginBottom: 4, alignSelf: "flex-start" }}>
          <strong>{hoveredPoint.name}</strong>
          <span>{hoveredPoint.company}</span>
          <span style={{ opacity: 0.6 }}> — capability {hoveredPoint.capability}, visibility {hoveredPoint.visibility} · click to open profile</span>
        </div>
      )}

      {/* Legend (HTML, below SVG) */}
      <div className="flex items-center gap-4" style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
        <div className="flex items-center" style={{ gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent-2)", display: "inline-block" }} />
          Hidden gem
        </div>
        <div className="flex items-center" style={{ gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }} />
          Tracked
        </div>
      </div>
    </div>
  );
}
