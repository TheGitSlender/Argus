"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/app/components/AppLayout";
import ScoreBand from "@/app/components/ScoreBand";
import RadarChart from "@/app/components/RadarChart";
import DimensionCard from "@/app/components/DimensionCard";
import SignalCard from "@/app/components/SignalCard";
import Dialog from "@/app/components/Dialog";

const DIMENSION_COLORS: Record<string, string> = {
  execution: "#A52700",
  technicalDepth: "#EC5E27",
  problemInsight: "#6E1A00",
  resourcefulness: "#C94A18",
  momentum: "#F2A87E",
};

const DIMENSION_LABELS: Record<string, string> = {
  execution: "Execution",
  technicalDepth: "Technical Depth",
  problemInsight: "Problem Insight",
  resourcefulness: "Resourcefulness",
  momentum: "Momentum",
};

interface FounderData {
  id: string;
  name: string;
  score: {
    composite: { value: number; low: number; high: number };
    execution: { value: number; low: number; high: number };
    technicalDepth: { value: number; low: number; high: number };
    problemInsight: { value: number; low: number; high: number };
    resourcefulness: { value: number; low: number; high: number };
    momentum: { value: number; low: number; high: number };
    visibilityIndex: number;
    capabilityVisibilityGap: number;
  } | null;
  signals: Array<{
    id: string;
    source: string;
    rawContent: string;
    ingestedAt: string;
    claims: Array<{
      id: string;
      text: string;
      category: string;
      verificationStatus: string;
    }>;
  }>;
  scoreHistory: Array<{
    dimension: string;
    newBand: { value: number; low: number; high: number };
    rationale: string;
    createdAt: string;
  }>;
}

export default function FounderProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [founder, setFounder] = useState<FounderData | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [notesText, setNotesText] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/founders/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFounder(data);
        }
      } catch (err) {
        console.error("Failed to load founder:", err);
      }
    }
    load();
  }, [id]);

  if (!founder) {
    return (
      <AppLayout>
        <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 1200, margin: "0 auto" }}>
          <div className="card" style={{ height: 200, opacity: 0.4 }} />
        </div>
      </AppLayout>
    );
  }

  const score = founder.score;
  const composite = score?.composite;

  const dimensions = score
    ? Object.entries(DIMENSION_LABELS).map(([key, label]) => ({
        name: label,
        color: DIMENSION_COLORS[key],
        value: score[key as keyof typeof score] && typeof score[key as keyof typeof score] === "object"
          ? (score[key as keyof typeof score] as { value: number }).value
          : 0,
        low: score[key as keyof typeof score] && typeof score[key as keyof typeof score] === "object"
          ? (score[key as keyof typeof score] as { low: number }).low
          : 0,
        high: score[key as keyof typeof score] && typeof score[key as keyof typeof score] === "object"
          ? (score[key as keyof typeof score] as { high: number }).high
          : 0,
        trend: "stable",
        rationale: "",
      }))
    : [];

  const radarDims = dimensions.map((d) => ({
    name: d.name,
    value: d.value,
    low: d.low,
    high: d.high,
    color: d.color,
  }));

  const signals = founder.signals.map((s) => ({
    id: s.id,
    category: s.claims[0]?.category ?? s.source,
    claim: s.claims[0]?.text ?? s.rawContent.slice(0, 200),
    trust: s.claims[0]?.verificationStatus?.toLowerCase() ?? "unverified",
    source: s.source,
    timestamp: s.ingestedAt,
  }));

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 1200, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div className="text-muted" style={{ fontSize: 12, marginBottom: "var(--space-2)" }}>
          <Link href="/dashboard" style={{ color: "inherit" }}>Dashboard</Link>
          {" / "}
          <Link href="/pipeline" style={{ color: "inherit" }}>Pipeline</Link>
          {" / "}
          <span style={{ color: "var(--color-text)" }}>{founder.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32 }}>{founder.name}</h1>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setNotesOpen(true)}>Log interview notes</button>
            <button className="btn btn-secondary" onClick={() => setPassOpen(true)}>Pass on this opportunity</button>
            <Link href={`/opportunities/${id}/memo`} className="btn btn-fill">Generate memo</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "var(--space-6)" }}>
          {/* Left Column */}
          <div>
            {/* Score Card */}
            {composite && (
              <div className="card" style={{ marginBottom: "var(--space-4)" }}>
                <div className="card-kicker">Founder Score</div>
                <ScoreBand value={composite.value} low={composite.low} high={composite.high} size="lg" />
                <div className="flex gap-4" style={{ marginTop: "var(--space-2)" }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Visibility</div>
                    <div style={{ fontSize: 14 }}>{score?.visibilityIndex ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Capability-Visibility Gap</div>
                    <div style={{ fontSize: 14 }}>{score?.capabilityVisibilityGap ?? 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Radar Chart */}
            {radarDims.length > 0 && (
              <div className="card" style={{ marginBottom: "var(--space-4)", alignItems: "center" }}>
                <div className="card-kicker">Dimension Radar</div>
                <RadarChart dimensions={radarDims} size={280} />
              </div>
            )}

            {/* Dimension Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {dimensions.map((d) => (
                <DimensionCard key={d.name} dimension={d} />
              ))}
            </div>
          </div>

          {/* Right Column — Signal Feed */}
          <div>
            <div className="card-kicker" style={{ marginBottom: "var(--space-2)" }}>Signal Feed</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {signals.length > 0 ? (
                signals.map((s) => <SignalCard key={s.id} signal={s} />)
              ) : (
                <div className="text-muted" style={{ padding: "var(--space-4)", textAlign: "center" }}>
                  No signals yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <Dialog open={notesOpen} onClose={() => setNotesOpen(false)} title="Log interview notes"
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setNotesOpen(false)}>Cancel</button>
              <button className="btn btn-fill" onClick={() => { setNotesOpen(false); setNotesText(""); }}>Save</button>
            </>
          }
        >
          <textarea className="input" placeholder="Notes from the interview..." value={notesText} onChange={(e) => setNotesText(e.target.value)} />
        </Dialog>

        <Dialog open={passOpen} onClose={() => setPassOpen(false)} title="Pass on this opportunity"
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setPassOpen(false)}>Cancel</button>
              <button className="btn btn-fill" onClick={() => setPassOpen(false)}>Confirm pass</button>
            </>
          }
        >
          <p>Are you sure you want to pass on this opportunity? This action cannot be undone.</p>
        </Dialog>
      </div>
    </AppLayout>
  );
}
