"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/app/components/AppLayout";
import { thesisFitPct } from "@/lib/thesis-fit";
import ScoreBand from "@/app/components/ScoreBand";

interface Founder {
  id: string;
  name: string;
  company: string;
  sector: string;
  track: string;
  daysInPipeline: number;
  founderScore: number;
  band: [number, number];
  thesisFit: number;
  visibility: number;
  capability: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface RawOpp {
  founders: any[];
  company: any;
  createdAt: string;
  track?: string;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function PipelinePage() {
  const [founders, setFounders] = useState<Founder[] | null>(null);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [track, setTrack] = useState("All");

  useEffect(() => {
    async function load() {
      try {
        const [res, thesisRes] = await Promise.all([
          fetch("/api/opportunities"),
          fetch("/api/thesis"),
        ]);
        const opps = await res.json();
        const thesisData = await thesisRes.json();
        const mapped: Founder[] = (opps as RawOpp[]).map((opp) => {
          const f = opp.founders?.[0]?.founder;
          const score = f?.score;
          return {
            id: opp.founders?.[0]?.founderId ?? "unknown",
            name: f?.name ?? "Unknown",
            company: opp.company?.name ?? "Unknown",
            sector: opp.company?.sector ?? "—",
            track: opp.track ?? "—",
            daysInPipeline: Math.floor((Date.now() - new Date(opp.createdAt).getTime()) / 86400000),
            founderScore: score?.composite?.value ?? 0,
            band: [score?.composite?.low ?? 0, score?.composite?.high ?? 0],
            thesisFit: thesisFitPct(opp.company?.sector, opp.company?.geography, thesisData),
            visibility: score?.visibilityIndex ?? 0,
            capability: score?.composite?.value ?? 0,
          };
        });
        setFounders(mapped);
      } catch (err) {
        console.error("Failed to load pipeline:", err);
        setFounders([]);
      }
    }
    load();
  }, []);

  const sectors = founders ? ["All", ...[...new Set(founders.map((f) => f.sector))].sort()] : ["All"];
  const tracks = ["All", "Inbound", "Outbound"];

  const filtered = founders
    ? [...founders]
        .filter((f) => sector === "All" || f.sector === sector)
        .filter((f) => track === "All" || f.track === track)
        .filter((f) => !query || f.name.toLowerCase().includes(query.toLowerCase()) || f.company.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.founderScore - a.founderScore)
    : [];

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 1440, margin: "0 auto" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
          <div>
            <h2 style={{ margin: 0 }}>Pipeline</h2>
            <span className="text-muted" style={{ fontSize: 13 }}>
              {filtered.length} of {founders?.length ?? 0} founders
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="Search..."
            style={{ maxWidth: 240 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="text-muted" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            Sector
            <select className="input" style={{ width: "auto", minWidth: 150 }} value={sector} onChange={(e) => setSector(e.target.value)}>
              {sectors.map((s) => (
                <option key={s} value={s}>{s === "—" ? "(none)" : s}</option>
              ))}
            </select>
          </label>
          <label className="text-muted" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            Track
            <select className="input" style={{ width: "auto", minWidth: 120 }} value={track} onChange={(e) => setTrack(e.target.value)}>
              {tracks.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Table */}
        {founders === null ? (
          <div className="card" style={{ height: 200, opacity: 0.4 }} />
        ) : (
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Founder</th>
                <th>Sector</th>
                <th>Track</th>
                <th>Days</th>
                <th>Score</th>
                <th>Thesis fit</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/founders/${f.id}`} style={{ textDecoration: "none", color: "var(--color-text)" }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)" }}>{f.name}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{f.company}</div>
                    </Link>
                  </td>
                  <td><span className="tag tag-neutral">{f.sector}</span></td>
                  <td className="text-muted">{f.track}</td>
                  <td className="text-muted">{f.daysInPipeline}d</td>
                  <td>
                    <ScoreBand value={f.founderScore} low={f.band[0]} high={f.band[1]} size="sm" showLabel={false} />
                    <span style={{ fontSize: 13, marginLeft: 8 }}>{f.founderScore}</span>
                  </td>
                  <td className="text-muted">{f.thesisFit}%</td>
                  <td className="text-muted">{f.visibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {founders && filtered.length === 0 && (
          <div className="text-muted" style={{ padding: "var(--space-6)", textAlign: "center" }}>
            No founders match this filter.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
