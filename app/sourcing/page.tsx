"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/AppLayout";

type ScoreBand = {
  value: number;
  low: number;
  high: number;
  coverage?: number;
};

type FounderScore = {
  composite: ScoreBand;
  visibilityIndex: number;
  capabilityVisibilityGap: number;
};

type Signal = {
  source: string;
  meta: Record<string, unknown> | null;
  occurredAt: string;
};

type Outreach = {
  id: string;
  status: string;
  draftMessage: string | null;
  reason: string | null;
  sentAt: string | null;
  repliedAt: string | null;
  convertedAt: string | null;
  notes: string | null;
};

type Founder = {
  founderId: string;
  name: string;
  company: string;
  score: FounderScore | null;
  source: string;
  signals: Signal[];
  outreach: Outreach | null;
  opportunityId: string;
  daysInPipeline: number;
  rank?: number;
  reason?: string;
};

type SourcingStats = {
  total: number;
  identified: number;
  drafted: number;
  sent: number;
  converted: number;
};

type ScanResult = {
  newFounders: number;
  totalOutbound: number;
  topRanked: Founder[];
  scanDuration: number;
  errors: { github: string | null; devpost: string | null };
};

const STATUS_COLORS: Record<string, string> = {
  IDENTIFIED: "var(--color-accent-2-300)",
  DRAFTED: "var(--color-accent-2-400)",
  SENT: "var(--color-accent-2-600)",
  REPLIED: "var(--color-accent-2-700)",
  CONVERTED: "var(--color-accent-2-500)",
  DECLINED: "var(--color-accent-600)",
  EXPIRED: "var(--color-neutral-500)",
};

function ScoreBar({ score }: { score: ScoreBand }) {
  const pct = Math.round((score.value / 100) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 48,
          height: 6,
          borderRadius: 3,
          background: "var(--color-divider)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            background:
              score.value >= 60
                ? "var(--color-accent)"
                : score.value >= 35
                  ? "var(--color-accent-2)"
                  : "var(--color-neutral-400)",
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: "var(--color-text-muted)", minWidth: 24 }}>
        {score.value}
      </span>
    </div>
  );
}

function FounderCard({
  founder,
  onActivate,
  onStatusChange,
}: {
  founder: Founder;
  onActivate: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [showDraft, setShowDraft] = useState(false);
  const signalMeta = founder.signals[0]?.meta ?? {};
  const status = founder.outreach?.status ?? "IDENTIFIED";
  const statusColor = STATUS_COLORS[status] ?? "var(--color-neutral-500)";

  const sourceBadge =
    founder.source === "GITHUB" ? { label: "GH", bg: "var(--color-neutral-800)" }
    : founder.source === "DEVPOST" ? { label: "DP", bg: "var(--color-accent-2-600)" }
    : { label: "OT", bg: "var(--color-neutral-700)" };

  return (
    <div
      className="card"
      style={{
        padding: "var(--space-4)",
        borderLeft: `3px solid ${statusColor}`,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{founder.name}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
            {founder.company}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {founder.rank !== undefined && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--color-accent)",
                background: "var(--color-bg)",
                border: "1px solid var(--color-divider)",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              #{founder.rank}
            </span>
          )}
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--color-bg)",
              background: sourceBadge.bg,
              borderRadius: 3,
              padding: "2px 5px",
              letterSpacing: 0.5,
            }}
          >
            {sourceBadge.label}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--color-bg)",
              background: statusColor,
              borderRadius: 3,
              padding: "2px 6px",
              letterSpacing: 0.3,
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {founder.score && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: 11, flexWrap: "wrap" }}>
          <span style={{ color: "var(--color-text-muted)" }}>composite</span>
          <ScoreBar score={founder.score.composite} />
          <span style={{ color: "var(--color-text-muted)" }}>vi</span>
          <span style={{ fontWeight: 600 }}>{founder.score.visibilityIndex}</span>
          <span style={{ color: "var(--color-text-muted)" }}>gap</span>
          <span
            style={{
              fontWeight: 600,
              color:
                founder.score.capabilityVisibilityGap > 0
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
            }}
          >
            {founder.score.capabilityVisibilityGap > 0 ? "+" : ""}
            {founder.score.capabilityVisibilityGap}
          </span>
        </div>
      )}

      {founder.reason && (
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {founder.reason}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.entries(signalMeta)
          .filter(([, v]) => v !== null && v !== undefined)
          .slice(0, 4)
          .map(([key, val]) => (
            <span key={key} className="tag tag-neutral" style={{ fontSize: 9 }}>
              {key}: {String(val).slice(0, 20)}
            </span>
          ))}
      </div>

      {founder.outreach?.draftMessage && (
        <button
          className="btn btn-secondary"
          style={{ fontSize: 11, padding: "4px 8px", alignSelf: "flex-start" }}
          onClick={() => setShowDraft(!showDraft)}
        >
          {showDraft ? "Hide draft" : "View draft"}
        </button>
      )}
      {showDraft && founder.outreach?.draftMessage && (
        <pre
          style={{
            fontSize: 11,
            lineHeight: 1.6,
            background: "var(--color-bg)",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-body)",
          }}
        >
          {founder.outreach.draftMessage}
        </pre>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: "var(--space-1)" }}>
        {status === "IDENTIFIED" && (
          <button
            className="btn btn-primary"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onActivate(founder.opportunityId)}
          >
            Generate draft
          </button>
        )}
        {status === "DRAFTED" && (
          <button
            className="btn btn-primary"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onStatusChange(founder.opportunityId, "SENT")}
          >
            Mark sent
          </button>
        )}
        {status === "SENT" && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onStatusChange(founder.opportunityId, "REPLIED")}
          >
            Mark replied
          </button>
        )}
        {status === "REPLIED" && (
          <button
            className="btn btn-primary"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onStatusChange(founder.opportunityId, "CONVERTED")}
          >
            Mark converted
          </button>
        )}
      </div>
    </div>
  );
}

function SourcingContent() {
  const [founders, setFounders] = useState<Founder[]>([]);
  const [stats, setStats] = useState<SourcingStats | null>(null);
  const [channels, setChannels] = useState<Array<{ source: string; found: number; drafted: number; converted: number; conversionPct: number; avgCapability: number | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/api/sourcing");
        const data = await res.json();
        if (cancelled) return;
        setFounders(data.founders ?? []);
        setStats(data.stats ?? null);
        setChannels(data.channels ?? []);
        setLoading(false);

        if ((data.founders ?? []).length === 0) {
          setScanning(true);
          try {
            const scanRes = await fetch("/api/sourcing/scan", { method: "POST" });
            const scanData: ScanResult = await scanRes.json();
            if (cancelled) return;
            setScanResult(scanData);
            const refresh = await fetch("/api/sourcing");
            const refreshData = await refresh.json();
            if (cancelled) return;
            setFounders(refreshData.founders ?? []);
            setStats(refreshData.stats ?? null);
            setChannels(refreshData.channels ?? []);
          } catch (err) {
            console.error("Auto-scan failed:", err);
          } finally {
            if (!cancelled) setScanning(false);
          }
        }
      } catch (err) {
        console.error("Failed to load sourcing data:", err);
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const refetch = async () => {
    const res = await fetch("/api/sourcing");
    const data = await res.json();
    setFounders(data.founders ?? []);
    setStats(data.stats ?? null);
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/sourcing/scan", { method: "POST" });
      const data: ScanResult = await res.json();
      setScanResult(data);
      await refetch();
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const handleActivate = async (opportunityId: string) => {
    try {
      await fetch(`/api/sourcing/${opportunityId}/activate`, { method: "POST" });
      await refetch();
    } catch (err) {
      console.error("Activation failed:", err);
    }
  };

  const handleStatusChange = async (opportunityId: string, status: string) => {
    try {
      await fetch(`/api/sourcing/${opportunityId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await refetch();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
        Loading sourcing pipeline...
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-6)", maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-5)",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Sourcing</h2>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              margin: "4px 0 0",
            }}
          >
            Outbound founder pipeline — GitHub + DevPost
          </p>
        </div>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 11, padding: "6px 12px" }}
          onClick={runScan}
          disabled={scanning}
        >
          {scanning ? "Scanning..." : "Run scan"}
        </button>
      </div>

      {scanResult && (
        <div
          className="card"
          style={{
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
            fontSize: 11,
            color: "var(--color-text-muted)",
            display: "flex",
            gap: "var(--space-4)",
            flexWrap: "wrap",
          }}
        >
          <span>
            New founders: <strong>{scanResult.newFounders}</strong>
          </span>
          <span>
            Total outbound: <strong>{scanResult.totalOutbound}</strong>
          </span>
          <span>
            Scan time: <strong>{(scanResult.scanDuration / 1000).toFixed(1)}s</strong>
          </span>
          {scanResult.errors.github && (
            <span style={{ color: "var(--color-accent-600)" }}>GitHub error</span>
          )}
          {scanResult.errors.devpost && (
            <span style={{ color: "var(--color-accent-600)" }}>DevPost error</span>
          )}
        </div>
      )}

      {stats && (
        <div className="sourcing-stats">
          <div className="stat-card" style={{ borderTop: "3px solid var(--color-accent)" }}>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card" style={{ borderTop: "3px solid var(--color-accent-2-300)" }}>
            <div className="stat-value">{stats.identified}</div>
            <div className="stat-label">Identified</div>
          </div>
          <div className="stat-card" style={{ borderTop: "3px solid var(--color-accent-2-400)" }}>
            <div className="stat-value">{stats.drafted}</div>
            <div className="stat-label">Drafted</div>
          </div>
          <div className="stat-card" style={{ borderTop: "3px solid var(--color-accent-2-600)" }}>
            <div className="stat-value">{stats.sent}</div>
            <div className="stat-label">Sent</div>
          </div>
          <div className="stat-card" style={{ borderTop: "3px solid var(--color-accent-2-500)" }}>
            <div className="stat-value">{stats.converted}</div>
            <div className="stat-label">Converted</div>
          </div>
        </div>
      )}

      {channels.length > 0 && (
          <div className="card" style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div className="card-kicker">Channel quality — which sources produce quality, not volume</div>
            <div className="table-wrap">
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr><th>Channel</th><th>Found</th><th>Drafted</th><th>Converted</th><th>Conv. rate</th><th>Avg capability</th></tr>
                </thead>
                <tbody>
                  {channels.map((c) => (
                    <tr key={c.source}>
                      <td><span className="tag tag-neutral">{c.source}</span></td>
                      <td>{c.found}</td>
                      <td>{c.drafted}</td>
                      <td>{c.converted > 0 ? <strong>{c.converted}</strong> : 0}</td>
                      <td>{c.conversionPct}%</td>
                      <td>{c.avgCapability ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      )}

      {founders.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: 13,
          }}
        >
          {scanning
            ? "Scanning GitHub and DevPost for promising founders..."
            : "No founders found. Run a scan to discover outbound targets."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {founders.map((f) => (
            <FounderCard
              key={f.opportunityId}
              founder={f}
              onActivate={handleActivate}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SourcingPage() {
  return (
    <AppLayout>
      <SourcingContent />
    </AppLayout>
  );
}
