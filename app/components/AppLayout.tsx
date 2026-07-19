"use client";

import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="flex-1" style={{ marginLeft: "248px" }}>
        {children}
      </main>
    </div>
  );
}
