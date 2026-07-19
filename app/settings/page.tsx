"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/AppLayout";

const ALL_SECTORS = ["Fintech infra", "Vertical SaaS", "Developer tools", "Healthtech", "Climate tech", "Consumer", "Marketplaces"];
const ALL_GEO = ["United States", "Canada", "United Kingdom", "European Union", "Latin America"];
const STAGES = ["Pre-seed", "Seed", "Series A"];
const RISKS = ["Conservative", "Moderate", "Aggressive"];

interface Thesis {
  sectors: string[];
  stage: string;
  geography: string[];
  checkSizeMin: number;
  checkSizeMax: number;
  ownershipMin: number;
  ownershipMax: number;
  riskAppetite: string;
}

export default function SettingsPage() {
  const [thesis, setThesis] = useState<Thesis>({
    sectors: [],
    stage: "Seed",
    geography: [],
    checkSizeMin: 250000,
    checkSizeMax: 1500000,
    ownershipMin: 7,
    ownershipMax: 12,
    riskAppetite: "Moderate",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/thesis");
        const data = await res.json();
        if (data) {
          setThesis({
            sectors: data.sectors ?? [],
            stage: data.stage ?? "Seed",
            geography: data.geographies ?? [],
            checkSizeMin: data.checkSizeUsd ?? 250000,
            checkSizeMax: (data.checkSizeUsd ?? 250000) * 6,
            ownershipMin: data.ownershipTargetPct ?? 7,
            ownershipMax: (data.ownershipTargetPct ?? 7) + 5,
            riskAppetite: data.riskAppetite ?? "Moderate",
          });
        }
      } catch (err) {
        console.error("Failed to load thesis:", err);
      }
    }
    load();
  }, []);

  const toggle = (list: string[], val: string) =>
    list.includes(val) ? list.filter((v) => v !== val) : [...list, val];

  const handleSave = async () => {
    try {
      await fetch("/api/thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Active thesis",
          sectors: thesis.sectors,
          stages: [thesis.stage],
          geographies: thesis.geography,
          checkSizeUsd: thesis.checkSizeMin,
          ownershipTargetPct: thesis.ownershipMin,
          riskAppetite: thesis.riskAppetite.toLowerCase(),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } catch (err) {
      console.error("Failed to save thesis:", err);
    }
  };

  const fmtMoney = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    return `$${Math.round(n / 1000)}K`;
  };

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-4) var(--space-6)", maxWidth: 720, margin: "0 auto" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
          <div>
            <h2 style={{ margin: 0 }}>Settings</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
              Configure your investment thesis. This drives scoring and filtering.
            </p>
          </div>
          <button className="btn btn-fill" onClick={handleSave}>Save thesis</button>
        </div>

        {saved && (
          <div style={{
            padding: "var(--space-2) var(--space-3)",
            marginBottom: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-accent-2-100)",
            color: "var(--color-accent-2-800)",
            fontSize: 14,
          }}>
            Thesis saved successfully.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Sectors */}
          <div>
            <h6 style={{ color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>Sectors</h6>
            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
              {ALL_SECTORS.map((s) => (
                <button
                  key={s}
                  className={`tag ${thesis.sectors.includes(s) ? "tag-accent" : "tag-neutral"}`}
                  style={{ cursor: "pointer", border: thesis.sectors.includes(s) ? "1px solid var(--color-accent)" : "1px solid transparent" }}
                  onClick={() => setThesis({ ...thesis, sectors: toggle(thesis.sectors, s) })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div>
            <h6 style={{ color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>Stage</h6>
            <div className="flex gap-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  className={`card ${thesis.stage === s ? "elev-sm" : ""}`}
                  style={{
                    cursor: "pointer",
                    padding: "var(--space-2) var(--space-3)",
                    borderColor: thesis.stage === s ? "var(--color-accent)" : "var(--color-divider)",
                    background: thesis.stage === s ? "var(--color-accent-100)" : "transparent",
                  }}
                  onClick={() => setThesis({ ...thesis, stage: s })}
                >
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Geography */}
          <div>
            <h6 style={{ color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>Geography</h6>
            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
              {ALL_GEO.map((g) => (
                <button
                  key={g}
                  className={`tag ${thesis.geography.includes(g) ? "tag-accent" : "tag-neutral"}`}
                  style={{ cursor: "pointer", border: thesis.geography.includes(g) ? "1px solid var(--color-accent)" : "1px solid transparent" }}
                  onClick={() => setThesis({ ...thesis, geography: toggle(thesis.geography, g) })}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Check Size */}
          <div>
            <h6 style={{ color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>Check Size</h6>
            <div className="flex items-center gap-3">
              <div className="field" style={{ flex: 1 }}>
                <label>Min</label>
                <input className="input" type="number" step={50000} value={thesis.checkSizeMin}
                  onChange={(e) => setThesis({ ...thesis, checkSizeMin: Number(e.target.value) })} />
              </div>
              <span className="text-muted" style={{ marginTop: 16 }}>—</span>
              <div className="field" style={{ flex: 1 }}>
                <label>Max</label>
                <input className="input" type="number" step={50000} value={thesis.checkSizeMax}
                  onChange={(e) => setThesis({ ...thesis, checkSizeMax: Number(e.target.value) })} />
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              {fmtMoney(thesis.checkSizeMin)} — {fmtMoney(thesis.checkSizeMax)}
            </div>
          </div>

          {/* Ownership Target */}
          <div>
            <h6 style={{ color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>Ownership Target</h6>
            <div className="flex items-center gap-3">
              <div className="field" style={{ flex: 1 }}>
                <label>Min %</label>
                <input className="input" type="number" step={1} value={thesis.ownershipMin}
                  onChange={(e) => setThesis({ ...thesis, ownershipMin: Number(e.target.value) })} />
              </div>
              <span className="text-muted" style={{ marginTop: 16 }}>—</span>
              <div className="field" style={{ flex: 1 }}>
                <label>Max %</label>
                <input className="input" type="number" step={1} value={thesis.ownershipMax}
                  onChange={(e) => setThesis({ ...thesis, ownershipMax: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          {/* Risk Appetite */}
          <div>
            <h6 style={{ color: "var(--color-accent)", marginBottom: "var(--space-2)" }}>Risk Appetite</h6>
            <div className="flex gap-2">
              {RISKS.map((r) => (
                <button
                  key={r}
                  className={`card ${thesis.riskAppetite === r ? "elev-sm" : ""}`}
                  style={{
                    cursor: "pointer",
                    padding: "var(--space-2) var(--space-3)",
                    borderColor: thesis.riskAppetite === r ? "var(--color-accent)" : "var(--color-divider)",
                    background: thesis.riskAppetite === r ? "var(--color-accent-100)" : "transparent",
                  }}
                  onClick={() => setThesis({ ...thesis, riskAppetite: r })}
                >
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{r}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
