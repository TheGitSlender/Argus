"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

const ArgusLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="8" r="5" fill="var(--color-accent)" />
    <circle cx="8" cy="18" r="5" fill="var(--color-accent-2)" />
    <circle cx="20" cy="18" r="5" fill="var(--color-accent-2)" />
  </svg>
);

const DashboardIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="7" height="7" rx="1" />
    <rect x="11" y="2" width="7" height="7" rx="1" />
    <rect x="2" y="11" width="7" height="7" rx="1" />
    <rect x="11" y="11" width="7" height="7" rx="1" />
  </svg>
);

const PipelineIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
  </svg>
);

const SourcingIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="3" />
    <path d="M10 3a7 7 0 0 1 7 7M10 5.5a4.5 4.5 0 0 1 4.5 4.5" strokeLinecap="round" />
    <path d="M10 1v2M10 17v2M1 10h2M17 10h2" strokeLinecap="round" opacity="0.4" />
  </svg>
);

const IntakeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 4v12M4 10h12" strokeLinecap="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="3" />
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4" strokeLinecap="round" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 5l10 10M15 5l-10 10" strokeLinecap="round" />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/pipeline", label: "Pipeline", icon: <PipelineIcon /> },
  { href: "/sourcing", label: "Sourcing", icon: <SourcingIcon /> },
  { href: "/intake", label: "Intake", icon: <IntakeIcon /> },
  { href: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Close on Escape key.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open]);

  return (
    <>
      {/* Hamburger — only visible on ≤900px via CSS */}
      <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Backdrop overlay — only visible on ≤900px when open */}
      <div
        className={`sidebar-overlay ${open ? "visible" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/dashboard" className="flex items-center gap-2" style={{ color: "var(--color-text)", textDecoration: "none" }}>
          <ArgusLogo />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px" }}>ARGUS</span>
        </Link>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`side-link ${pathname === item.href ? "active" : ""}`}
              onClick={close}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
