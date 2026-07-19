"use client";

import { useState } from "react";
import AppLayout from "@/app/components/AppLayout";

const SECTORS = ["Fintech infra", "Vertical SaaS", "Developer tools", "Healthtech", "Climate tech", "Consumer", "Marketplaces"];

export default function IntakePage() {
  const [company, setCompany] = useState("");
  const [founderName, setFounderName] = useState("");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [pitch, setPitch] = useState("");
  const [deckName, setDeckName] = useState("");
  const [artifactLink, setArtifactLink] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!company.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!deckName) {
      setError("Please upload a pitch deck.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company,
          founderName,
          email,
          sector,
          pitch,
          deckUrl: artifactLink || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setDeckName(file.name);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDeckName(file.name);
  };

  if (submitted) {
    return (
      <AppLayout>
        <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 640 }}>
          <div className="card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
            <div className="card-kicker" style={{ fontSize: 14, marginBottom: "var(--space-2)" }}>Application received</div>
            <p style={{ fontSize: 16, marginBottom: "var(--space-4)" }}>
              {company} has been submitted for review.
            </p>
            <button className="btn btn-primary" onClick={() => {
              setSubmitted(false);
              setCompany("");
              setFounderName("");
              setEmail("");
              setSector("");
              setPitch("");
              setDeckName("");
              setArtifactLink("");
            }}>
              Submit another founder
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 640 }}>
        <h2 style={{ margin: "0 0 var(--space-1)" }}>Intake</h2>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
          Submit a founder for review. All fields marked with * are required.
        </p>

        {error && (
          <div style={{
            padding: "var(--space-2) var(--space-3)",
            marginBottom: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-accent-100)",
            color: "var(--color-accent-800)",
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div className="field">
            <label>Company name *</label>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div className="field">
              <label>Founder name</label>
              <input className="input" value={founderName} onChange={(e) => setFounderName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="founder@company.com" />
            </div>
          </div>

          <div className="field">
            <label>Sector</label>
            <select className="input" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">Select a sector</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="field">
            <label>One-line pitch</label>
            <textarea className="input" value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="What does this company do? (optional)" />
          </div>

          <div className="field">
            <label>Pitch deck *</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("deck-input")?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--color-accent)" : "var(--color-divider)"}`,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "var(--color-accent-100)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {deckName ? (
                <span style={{ fontSize: 14 }}>{deckName}</span>
              ) : (
                <span className="text-muted" style={{ fontSize: 14 }}>
                  Drop a PDF here, or click to browse (max 25MB)
                </span>
              )}
              <input id="deck-input" type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileSelect} />
            </div>
          </div>

          <div className="field">
            <label>Data room / artifact link</label>
            <input className="input" value={artifactLink} onChange={(e) => setArtifactLink(e.target.value)} placeholder="https://..." />
          </div>

          <button className="btn btn-fill btn-block" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit for review"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
