"use client";

import { useEffect, useState } from "react";

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
  IDENTIFIED: "#8b5cf6",
  DRAFTED: "#f59e0b",
  SENT: "#3b82f6",
  REPLIED: "#22c55e",
  CONVERTED: "#10b981",
  DECLINED: "#ef4444",
  EXPIRED: "#6b7280",
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
          background: "var(--color-border)",
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
                  : "var(--color-muted)",
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: "var(--color-text-secondary)", minWidth: 24 }}>
        {score.value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${accent || "var(--color-accent)"}` }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
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
  const statusColor = STATUS_COLORS[status] ?? "var(--color-muted)";

  const sourceBadge =
    founder.source === "GITHUB" ? { label: "GH", bg: "#1f2937" }
    : founder.source === "DEVPOST" ? { label: "DP", bg: "#1e40af" }
    : { label: "OT", bg: "#374151" };

  return (
    <div
      className="card"
      style={{
        padding: 16,
        borderLeft: `3px solid ${statusColor}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{founder.name}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {founder.company}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {founder.rank !== undefined && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--color-accent)",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
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
              color: "#fff",
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
              color: "#fff",
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11 }}>
          <span style={{ color: "var(--color-text-secondary)" }}>composite</span>
          <ScoreBar score={founder.score.composite} />
          <span style={{ color: "var(--color-text-secondary)" }}>vi</span>
          <span style={{ fontWeight: 600 }}>{founder.score.visibilityIndex}</span>
          <span style={{ color: "var(--color-text-secondary)" }}>gap</span>
          <span
            style={{
              fontWeight: 600,
              color:
                founder.score.capabilityVisibilityGap > 0
                  ? "var(--color-accent)"
                  : "var(--color-text-secondary)",
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
            color: "var(--color-text-secondary)",
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
            <span key={key} className="tag" style={{ fontSize: 9 }}>
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
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            padding: 12,
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-body)",
          }}
        >
          {founder.outreach.draftMessage}
        </pre>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
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

export default function SourcingPage() {
  const [founders, setFounders] = useState<Founder[]>([]);
  const [stats, setStats] = useState<SourcingStats | null>(null);
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
      <div style={{ padding: 32, color: "var(--color-text-secondary)" }}>
        Loading sourcing pipeline...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Sourcing</h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
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
            padding: 12,
            marginBottom: 16,
            fontSize: 11,
            color: "var(--color-text-secondary)",
            display: "flex",
            gap: 16,
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
            <span style={{ color: "#ef4444" }}>GitHub error</span>
          )}
          {scanResult.errors.devpost && (
            <span style={{ color: "#ef4444" }}>DevPost error</span>
          )}
        </div>
      )}

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Total" value={stats.total} accent="var(--color-accent)" />
          <StatCard label="Identified" value={stats.identified} accent="#8b5cf6" />
          <StatCard label="Drafted" value={stats.drafted} accent="#f59e0b" />
          <StatCard label="Sent" value={stats.sent} accent="#3b82f6" />
          <StatCard label="Converted" value={stats.converted} accent="#10b981" />
        </div>
      )}

      {founders.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: 13,
          }}
        >
          {scanning
            ? "Scanning GitHub and DevPost for promising founders..."
            : "No founders found. Run a scan to discover outbound targets."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
