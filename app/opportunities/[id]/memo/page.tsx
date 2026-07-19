"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/app/components/AppLayout";

interface MemoData {
  decision: string;
  snapshot: string;
  hypotheses: string[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  problemProduct: string;
  traction: Array<{ metric: string; value: string }>;
  gaps: string[];
  bearCase: string;
}

interface OpportunityData {
  id: string;
  company: { name: string } | null;
  memo: MemoData | null;
  founders: Array<{ founder: { name: string } | null } | null>;
}

export default function MemoPage() {
  const params = useParams();
  const id = params.id as string;
  const [opp, setOpp] = useState<OpportunityData | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [done, setDone] = useState(false);
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/opportunities/${id}/memo`);
        const found = (await res.json()) as OpportunityData | null;
        if (found && !("error" in (found as object))) {
          setOpp(found);
          if (found.memo) {
            setDone(true);
          }
        }
      } catch (err) {
        console.error("Failed to load opportunity:", err);
      }
    }
    load();
  }, [id]);

  const generateMemo = async () => {
    setGenerating(true);
    setStreamedText("");
    setDone(false);

    try {
      const res = await fetch(`/api/opportunities/${id}/memo`, { method: "POST" });
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse streaming JSON chunks
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("0:")) {
            // Text delta from streamObject
            const text = line.slice(2);
            setStreamedText((prev) => prev + text);
          }
        }
      }

      setDone(true);
    } catch (err) {
      console.error("Memo generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  function buildMemoText(memo: MemoData): string {
    const lines: string[] = [];
    lines.push(`# Investment Memo`);
    lines.push("");
    lines.push(`## Decision: ${memo.decision.toUpperCase()}`);
    lines.push("");
    if (memo.snapshot) lines.push(memo.snapshot);
    if (memo.hypotheses?.length) {
      lines.push("");
      lines.push("## Investment Hypotheses");
      memo.hypotheses.forEach((h) => lines.push(`- ${h}`));
    }
    if (memo.swot) {
      lines.push("");
      lines.push("## SWOT");
      lines.push("### Strengths");
      memo.swot.strengths?.forEach((s) => lines.push(`- ${s}`));
      lines.push("### Weaknesses");
      memo.swot.weaknesses?.forEach((w) => lines.push(`- ${w}`));
      lines.push("### Opportunities");
      memo.swot.opportunities?.forEach((o) => lines.push(`- ${o}`));
      lines.push("### Threats");
      memo.swot.threats?.forEach((t) => lines.push(`- ${t}`));
    }
    if (memo.problemProduct) {
      lines.push("");
      lines.push("## Problem & Product");
      lines.push(memo.problemProduct);
    }
    if (memo.traction?.length) {
      lines.push("");
      lines.push("## Traction");
      memo.traction.forEach((t) => lines.push(`- ${t.metric}: ${t.value}`));
    }
    if (memo.gaps?.length) {
      lines.push("");
      lines.push("## Gaps");
      memo.gaps.forEach((g) => lines.push(`- ${g}`));
    }
    if (memo.bearCase) {
      lines.push("");
      lines.push("## Bear Case");
      lines.push(memo.bearCase);
    }
    return lines.join("\n");
  }

  // Typewriter effect for static memo
  useEffect(() => {
    if (!opp?.memo || done || generating) return;

    const memo = opp.memo;
    const fullText = buildMemoText(memo);
    let index = 0;

    const tick = () => {
      if (index < fullText.length) {
        setStreamedText(fullText.slice(0, index + 3));
        index += 3;
        timerRef.current = setTimeout(tick, 14);
      } else {
        setDone(true);
      }
    };

    timerRef.current = setTimeout(tick, 14);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [opp, done, generating]);

  const companyName = opp?.company?.name ?? "Unknown";
  const founderName = opp?.founders?.[0]?.founder?.name ?? "Unknown";

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 1200, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div className="text-muted" style={{ fontSize: 12, marginBottom: "var(--space-2)" }}>
          <Link href="/dashboard" style={{ color: "inherit" }}>Dashboard</Link>
          {" / "}
          <Link href={`/founders/${id}`} style={{ color: "inherit" }}>{founderName}</Link>
          {" / "}
          <span style={{ color: "var(--color-text)" }}>Memo</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
          <div>
            <h2 style={{ margin: 0 }}>{companyName} — investment memo</h2>
            <span className={`tag ${generating ? "tag-accent-2" : "tag-accent"}`} style={{ marginTop: 4 }}>
              {generating ? "Generating memo..." : done ? "Memo ready" : "Not generated"}
            </span>
          </div>
          {!done && !generating && (
            <button className="btn btn-fill" onClick={generateMemo}>Generate memo</button>
          )}
        </div>

        {/* Memo Body */}
        <div style={{ maxWidth: 720, fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
          {streamedText ? (
            <div>
              {streamedText.split("\n").map((line, i) => {
                if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 32, marginTop: i > 0 ? "var(--space-4)" : 0 }}>{line.slice(2)}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 24, marginTop: "var(--space-4)" }}>{line.slice(3)}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 18, marginTop: "var(--space-3)" }}>{line.slice(4)}</h3>;
                if (line.startsWith("- ")) return <li key={i} style={{ marginLeft: "var(--space-3)" }}>{line.slice(2)}</li>;
                if (line === "") return <br key={i} />;
                return <p key={i}>{line}</p>;
              })}
              {!done && (
                <span style={{
                  display: "inline-block",
                  width: 8,
                  height: 16,
                  background: "var(--color-accent)",
                  marginLeft: 2,
                  animation: "blink 1s step-end infinite",
                }} />
              )}
            </div>
          ) : (
            <div className="text-muted" style={{ padding: "var(--space-6)", textAlign: "center" }}>
              {generating ? "Starting memo generation..." : "Click \"Generate memo\" to start."}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </AppLayout>
  );
}
