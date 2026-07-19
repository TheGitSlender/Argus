"use client";

interface Signal {
  id: string;
  category: string;
  claim: string;
  trust: string;
  source: string;
  timestamp: string;
}

interface SignalCardProps {
  signal: Signal;
}

function trustBadge(trust: string) {
  const t = trust.toLowerCase();
  if (t === "verified") {
    return { label: "Verified", bg: "#e6f4ea", color: "#1e7e34" };
  }
  if (t === "contradicted") {
    return { label: "Contradicted", bg: "#fde8e8", color: "#c62828" };
  }
  return { label: "Unverified", bg: "#fff8e1", color: "#f57f17" };
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function SignalCard({ signal }: SignalCardProps) {
  const badge = trustBadge(signal.trust);

  return (
    <div className="card" style={{ padding: "var(--space-3)" }}>
      <div className="flex items-center justify-between">
        <span className="tag tag-neutral">{signal.category}</span>
        <span className="text-muted" style={{ fontSize: "11px" }}>{relTime(signal.timestamp)}</span>
      </div>
      <p style={{ fontSize: "13px", margin: "var(--space-2) 0" }}>{signal.claim}</p>
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            background: badge.bg,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
        <span className="text-muted" style={{ fontSize: "11px" }}>{signal.source}</span>
      </div>
    </div>
  );
}
