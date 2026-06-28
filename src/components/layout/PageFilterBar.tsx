"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Shared filter shell — Destaques / Campanhas / Criativos / Relatórios. */
export function PageFilterBar({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ui-filter-panel-grid ui-filter-panel-grid--campaign-creator ui-filter-panel-card mt-3 p-3 text-xs [&_button]:py-1.5 [&_button]:text-xs",
        className
      )}
    >
      {children}
    </div>
  );
}
