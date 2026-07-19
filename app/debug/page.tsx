"use client";

// Agentic-traceability viewer: every LLM call the system has ever made —
// step, model, tokens, latency, inputs, raw output. The append-only
// ReasoningLog IS the audit trail; this page just renders it.

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/AppLayout";

interface LogRow {
  id: string;
  step: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  createdAt: string;
  inputRefs: Record<string, unknown>;
  output: string;
}

interface Payload {
  aggregate: { totalCalls: number; totalInputTokens: number; totalOutputTokens: number; estimatedCostUsd: number };
  steps: string[];
  rows: LogRow[];
}

export default function DebugPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [step, setStep] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/debug/reasoning${step ? `?step=${encodeURIComponent(step)}` : ""}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [step]);

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 1440, margin: "0 auto" }}>
        <h2 style={{ marginBottom: 4 }}>Reasoning Log</h2>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>
          Every LLM call, append-only. This is how each score traces to its evidence.
        </p>

        {data && (
          <div className="flex gap-3" style={{ margin: "var(--space-4) 0", flexWrap: "wrap" }}>
            {[
              ["Total calls", data.aggregate.totalCalls.toLocaleString()],
              ["Tokens in", data.aggregate.totalInputTokens.toLocaleString()],
              ["Tokens out", data.aggregate.totalOutputTokens.toLocaleString()],
              ["Est. total spend", `$${data.aggregate.estimatedCostUsd}`],
            ].map(([k, v]) => (
              <div key={k} className="card" style={{ padding: "10px 18px" }}>
                <div style={{ fontSize: 22, fontFamily: "var(--font-heading)" }}>{v}</div>
                <div className="card-kicker">{k}</div>
              </div>
            ))}
          </div>
        )}

        <select className="input" style={{ width: "auto", minWidth: 220, marginBottom: "var(--space-3)" }} value={step} onChange={(e) => setStep(e.target.value)}>
          <option value="">All steps</option>
          {data?.steps.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>When</th><th>Step</th><th>Model</th><th>Tokens</th><th>Latency</th></tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => (
                <>
                  <tr key={r.id} onClick={() => setExpanded(expanded === r.id ? null : r.id)} style={{ cursor: "pointer" }}>
                    <td className="text-muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleTimeString()}</td>
                    <td><span className="tag tag-neutral">{r.step}</span></td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{r.model}</td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{r.inputTokens ?? "—"} → {r.outputTokens ?? "—"}</td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{r.latencyMs ? `${r.latencyMs}ms` : "—"}</td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={5} style={{ background: "var(--color-bg)" }}>
                        <div style={{ fontSize: 12, padding: 8 }}>
                          <strong>inputRefs:</strong> <code>{JSON.stringify(r.inputRefs)}</code>
                          <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, maxHeight: 260, overflow: "auto" }}>{r.output}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
