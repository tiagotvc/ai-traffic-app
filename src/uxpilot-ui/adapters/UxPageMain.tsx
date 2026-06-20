"use client";

import type { ReactNode } from "react";

/** Shared UX Pilot page shell (matches synced `<main>` layout). */
export function UxPageMain({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`ux-pilot-page flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6 ${className}`.trim()}
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
    >
      {children}
    </main>
  );
}
