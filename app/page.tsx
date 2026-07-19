import Link from "next/link";

const ArgusLogo = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="6" r="3.4" fill="var(--color-accent)" />
    <circle cx="5" cy="18" r="3.4" fill="var(--color-accent-2)" />
    <circle cx="21" cy="18" r="3.4" fill="var(--color-accent-2)" />
  </svg>
);

export default function LandingPage() {
  return (
    <div style={{ background: "var(--color-bg)", color: "var(--color-text)", minHeight: "100vh" }}>
      {/* Navigation */}
      <header className="nav" style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
          <ArgusLogo />
          <span className="nav-brand" style={{ letterSpacing: "0.02em" }}>ARGUS</span>
        </div>
        <a href="#platform">Platform</a>
        <a href="#how-it-works">How it works</a>
        <a href="#verification">Verification</a>
        <Link href="/dashboard">Sign in</Link>
        <Link className="btn btn-fill" href="/intake">Request access</Link>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "88px 24px 40px", textAlign: "left" }}>
        <span className="tag tag-outline" style={{ marginBottom: "var(--space-4)", display: "inline-flex" }}>
          Underwriting intelligence for early-stage investors
        </span>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 64px)", lineHeight: 1.04, letterSpacing: "-0.02em", margin: "var(--space-4) 0", maxWidth: 820 }}>
          Argus sees the signal before the round is priced.
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, maxWidth: 640, color: "var(--color-text-secondary)", margin: "0 0 var(--space-6)" }}>
          Every claim a founder makes, checked against the record. Every founder scored on capability, not just visibility.
          Argus reads the pipeline your team can&apos;t get to, and tells you which parts of the story hold up.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-fill" href="/intake" style={{ fontSize: 15, padding: "12px 22px" }}>
            Request access
          </Link>
          <a className="btn btn-secondary" href="#how-it-works" style={{ fontSize: 15, padding: "12px 22px" }}>
            See how it works
          </a>
        </div>
      </section>

      {/* The Problem */}
      <section id="platform" style={{ maxWidth: 1000, margin: "0 auto", padding: "64px 24px", borderTop: "1px solid var(--color-divider)" }}>
        <div className="landing-problem-grid">
          <div>
            <h6 style={{ color: "var(--color-accent)" }}>The problem</h6>
            <h2 style={{ fontSize: 34, maxWidth: 360 }}>Most of what a fund is told, no one has checked.</h2>
          </div>
          <div style={{ textAlign: "justify" }}>
            <p>A pitch deck is a claim, not a fact. &quot;40 design partners.&quot; &quot;An exclusive bank partnership.&quot; &quot;On track for launch.&quot; Some of it holds up. Some of it doesn&apos;t — and by the time a fund finds out which is which, the round has often already closed.</p>
            <p>Argus sits underneath the pipeline and does the checking continuously: cross-referencing what a founder says against data rooms, reference calls, and public record, then surfacing the gap between a founder&apos;s visibility in the market and their underlying capability — before a term sheet is on the table, not after.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px", borderTop: "1px solid var(--color-divider)" }}>
        <h6 style={{ color: "var(--color-accent)" }}>How it works</h6>
        <h2 style={{ fontSize: 34, marginBottom: "var(--space-6)", maxWidth: 520 }}>
          From inbound application to investment memo, in four passes.
        </h2>
        <div className="landing-steps-grid">
          {[
            { num: "01", title: "Intake", desc: "Founders apply directly or get routed in from scouts. Structured fields replace the deck-shaped guessing game." },
            { num: "02", title: "Verification", desc: "Every material claim is checked against data rooms, references and public sources, and marked verified, unverified, or contradicted." },
            { num: "03", title: "Scoring", desc: "A founder score across execution, market insight, team strength, capital efficiency and coachability — each with a confidence band, not a false precision." },
            { num: "04", title: "Memo", desc: "A drafted investment memo — snapshot, hypotheses, SWOT and traction — ready for partner review, not a blank page." },
          ].map((step) => (
            <div className="card" key={step.num}>
              <div className="card-kicker" style={{ fontVariantNumeric: "tabular-nums", fontSize: 26, fontFamily: "var(--font-heading)", color: "var(--color-accent-2)", opacity: 1 }}>
                {step.num}
              </div>
              <div className="card-title">{step.title}</div>
              <p className="card-body">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verification */}
      <section id="verification" style={{ borderTop: "1px solid var(--color-divider)", borderBottom: "1px solid var(--color-divider)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px" }} className="landing-verify-grid">
          <div>
            <h6 style={{ color: "var(--color-accent)" }}>Verification</h6>
            <h2 style={{ fontSize: 34, maxWidth: 440 }}>A trust label on every claim, not just a score on the founder.</h2>
            <p style={{ maxWidth: 440, color: "var(--color-text-secondary)" }}>
              Argus doesn&apos;t just tell you what a founder said — it tells you how sure it is, and why. Contradictions get surfaced immediately, with the source that raised them.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {[
              { claim: "40 design partners onboarded, average NPS of 61.", meta: "Data room, cross-checked with 3 customer calls", tag: "Verified", tagStyle: { background: "var(--color-accent-2-100)", color: "var(--color-accent-2-800)" } },
              { claim: "Projected $180K ARR by Q4 2026.", meta: "Founder deck only, no independent confirmation", tag: "Unverified", tagStyle: { background: "var(--color-neutral-100)", color: "var(--color-neutral-800)" } },
              { claim: "Claims an exclusive bank-consortium partnership.", meta: "Consortium spokesperson states no exclusivity exists", tag: "Contradicted", tagStyle: { background: "var(--color-accent-100)", color: "var(--color-accent-800)" }, border: "var(--color-accent)" },
            ].map((item, i) => (
              <div className="card" key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...(item.border ? { borderColor: item.border } : {}) }}>
                <div>
                  <div className="card-title" style={{ fontSize: 15 }}>{item.claim}</div>
                  <div className="card-meta">{item.meta}</div>
                </div>
                <span className="tag" style={item.tagStyle}>{item.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="band-accent" style={{ padding: "72px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 36, color: "var(--color-bg)", marginBottom: "var(--space-3)" }}>
            See your pipeline the way Argus sees it.
          </h2>
          <p style={{ color: "color-mix(in srgb, var(--color-bg) 85%, transparent)", marginBottom: "var(--space-6)", fontSize: 17 }}>
            Request access and we&apos;ll load your active thesis within a day.
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center", flexWrap: "wrap" }}>
            <input className="input" placeholder="Work email" style={{ maxWidth: 280, background: "var(--color-bg)", borderColor: "transparent" }} />
            <Link className="btn" href="/intake" style={{ background: "var(--color-bg)", color: "var(--color-accent)", fontSize: 15, padding: "0 22px" }}>
              Request access
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ArgusLogo size={18} />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14 }}>ARGUS</span>
        </div>
        <div className="text-muted" style={{ fontSize: 13 }}>&copy; 2026 Argus. Underwriting intelligence for early-stage investors.</div>
      </footer>

      {/* Landing page responsive styles — scoped to avoid polluting the design system */}
      <style>{`
        .landing-problem-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: var(--space-8); }
        .landing-steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
        .landing-verify-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); align-items: center; }

        @media (max-width: 900px) {
          .landing-problem-grid { grid-template-columns: 1fr; }
          .landing-steps-grid { grid-template-columns: repeat(2, 1fr); }
          .landing-verify-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .landing-steps-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
