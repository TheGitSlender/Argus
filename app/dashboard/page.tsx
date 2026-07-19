"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/app/components/AppLayout";
import { thesisFitPct } from "@/lib/thesis-fit";
import ScatterChart from "@/app/components/ScatterChart";
import ScoreBand from "@/app/components/ScoreBand";

interface Founder {
  id: string;
  name: string;
  company: string;
  sector: string;
  geography: string;
  founderScore: number;
  band: [number, number];
  thesisFit: number;
  visibility: number;
  capability: number;
  daysInPipeline: number;
}

interface Thesis {
  sectors: string[];
  stage: string;
  geography: string[];
  checkSizeMin: number;
  checkSizeMax: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface RawOpp {
  founders: any[];
  company: any;
  createdAt: string;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function DashboardPage() {
  const router = useRouter();
  const [founders, setFounders] = useState<Founder[] | null>(null);
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [query, setQuery] = useState("");
  const [nlFilter, setNlFilter] = useState<{ sectors: string[]; geographies: string[]; keywords: string[]; hiddenGemsOnly?: boolean | null } | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  async function runNlQuery() {
    if (query.trim().length < 3) return;
    setNlLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const data = await res.json();
      if (data.filter) setNlFilter(data.filter);
    } catch (err) {
      console.error("NL query failed:", err);
    } finally {
      setNlLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [oppRes, thesisRes] = await Promise.all([
          fetch("/api/opportunities"),
          fetch("/api/thesis"),
        ]);
        const opps = await oppRes.json();
        const thesisData = await thesisRes.json();

        const mapped: Founder[] = (opps as RawOpp[]).map((opp) => {
          const f = opp.founders?.[0]?.founder;
          const score = f?.score;
          return {
            id: opp.founders?.[0]?.founderId ?? "unknown",
            name: f?.name ?? "Unknown",
            company: opp.company?.name ?? "Unknown",
            sector: opp.company?.sector ?? "—",
            geography: opp.company?.geography ?? "—",
            founderScore: score?.composite?.value ?? 0,
            band: [score?.composite?.low ?? 0, score?.composite?.high ?? 0],
            thesisFit: thesisFitPct(opp.company?.sector, opp.company?.geography, thesisData),
            visibility: score?.visibilityIndex ?? 0,
            capability: score?.composite?.value ?? 0,
            daysInPipeline: Math.floor((Date.now() - new Date(opp.createdAt).getTime()) / 86400000),
          };
        });

        setFounders(mapped);
        setThesis(thesisData ? {
          sectors: thesisData.sectors ?? [],
          stage: thesisData.stage ?? "",
          geography: thesisData.geographies ?? [],
          checkSizeMin: thesisData.checkSizeUsd ?? 0,
          checkSizeMax: (thesisData.checkSizeUsd ?? 0) * 6,
        } : null);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setFounders([]);
      }
    }
    load();
  }, []);

  const fmtMoney = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    return `$${Math.round(n / 1000)}K`;
  };

  const sorted = founders
    ? [...founders]
        .filter((f) => {
          if (nlFilter) {
            const inList = (value: string, list: string[]) =>
              list.length === 0 || list.some((x) => value.toLowerCase().includes(x.toLowerCase()) || x.toLowerCase().includes(value.toLowerCase()));
            if (!inList(f.sector, nlFilter.sectors)) return false;
            if (!inList(f.geography, nlFilter.geographies)) return false;
            if (nlFilter.hiddenGemsOnly && f.capability - f.visibility <= 30) return false;
            if (nlFilter.keywords.length > 0) {
              const hay = `${f.name} ${f.company} ${f.sector}`.toLowerCase();
              if (!nlFilter.keywords.some((k) => hay.includes(k.toLowerCase()))) return false;
            }
            return true;
          }
          return !query || f.name.toLowerCase().includes(query.toLowerCase()) || f.company.toLowerCase().includes(query.toLowerCase());
        })
        .sort((a, b) => b.founderScore - a.founderScore)
    : [];

  const top5 = sorted.slice(0, 5);

  const stats = founders
    ? {
        total: founders.length,
        avgScore: founders.length
          ? Math.round(founders.reduce((s, f) => s + f.founderScore, 0) / founders.length)
          : 0,
        hiddenGems: founders.filter((f) => f.capability - f.visibility > 30).length,
        companies: new Set(founders.map((f) => f.company)).size,
      }
    : null;

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 1440, margin: "0 auto" }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <input
            className="input"
            placeholder={nlLoading ? "Interpreting query…" : "Search, or ask: 'technical founder, Berlin, ai-infra, hidden gems' — press Enter"}
            onKeyDown={(e) => { if (e.key === "Enter") runNlQuery(); }}
            style={{ maxWidth: 280 }}
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (nlFilter) setNlFilter(null); }}
          />
          {nlFilter && (
            <span className="tag tag-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              AI filter:
              {nlFilter.sectors.length > 0 && ` sectors=${nlFilter.sectors.join("/")}`}
              {nlFilter.geographies.length > 0 && ` geo=${nlFilter.geographies.join("/")}`}
              {nlFilter.hiddenGemsOnly && " 💎 hidden gems"}
              {nlFilter.keywords.length > 0 && ` kw=${nlFilter.keywords.join(",")}`}
              <button onClick={() => setNlFilter(null)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
            </span>
          )}
        </div>

        {founders === null ? (
          <>
            <div className="dashboard-stats">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="stat-card" style={{ height: 80, opacity: 0.3 }} />
              ))}
            </div>
            <div className="dashboard-grid">
              <div className="card" style={{ height: 300, opacity: 0.3 }} />
              <div className="card" style={{ height: 300, opacity: 0.3 }} />
            </div>
          </>
        ) : (
          <>
            {/* Stats Row */}
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-value">{stats!.total}</div>
                <div className="stat-label">Total Founders</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats!.avgScore}</div>
                <div className="stat-label">Avg Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats!.hiddenGems}</div>
                <div className="stat-label">Hidden Gems</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats!.companies}</div>
                <div className="stat-label">Companies</div>
              </div>
            </div>

            {/* Chart + Pipeline grid */}
            <div className="dashboard-grid">
              {/* Scatter Chart */}
              <div className="card">
                <div className="card-kicker">Capability vs. Visibility</div>
                <ScatterChart
                  data={founders
                    .filter((f) => f.capability > 0)
                    .map((f) => ({
                      id: f.id,
                      name: f.name,
                      company: f.company,
                      visibility: f.visibility,
                      capability: f.capability,
                    }))}
                  onSelect={(id) => router.push(`/founders/${id}`)}
                />
              </div>

              {/* Top 5 Pipeline */}
              <div className="card">
                <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)" }}>
                  <div className="card-kicker">Top Pipeline</div>
                  <Link href="/pipeline" className="btn btn-ghost" style={{ fontSize: 12 }}>View all</Link>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Founder</th>
                      <th>Score</th>
                      <th>Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <Link href={`/founders/${f.id}`} style={{ textDecoration: "none", color: "var(--color-text)" }}>
                            <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)" }}>{f.name}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>{f.company}</div>
                          </Link>
                        </td>
                        <td>
                          <ScoreBand value={f.founderScore} low={f.band[0]} high={f.band[1]} size="sm" showLabel={false} />
                          <span style={{ fontSize: 13, marginLeft: 8 }}>{f.founderScore}</span>
                        </td>
                        <td className="text-muted">{f.daysInPipeline}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {top5.length === 0 && (
                  <div className="text-muted" style={{ padding: "var(--space-4)", textAlign: "center" }}>
                    No founders in pipeline yet.
                  </div>
                )}
              </div>
            </div>

            {/* Thesis Panel */}
            {thesis && (
              <div className="card">
                <div className="card-kicker">Active Thesis</div>
                <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Sectors</div>
                    <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                      {thesis.sectors.map((s) => <span key={s} className="tag tag-accent">{s}</span>)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Stage</div>
                    <span className="tag tag-accent-2">{thesis.stage}</span>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Geography</div>
                    <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                      {thesis.geography.map((g) => <span key={g} className="tag tag-neutral">{g}</span>)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Check size</div>
                    <span style={{ fontSize: 14 }}>{fmtMoney(thesis.checkSizeMin)} — {fmtMoney(thesis.checkSizeMax)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
