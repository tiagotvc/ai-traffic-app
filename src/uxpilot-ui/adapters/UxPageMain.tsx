"use client";

import type { ReactNode } from "react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { cn } from "@/lib/cn";

/** Shared UX Pilot page shell — section gaps only; padding from `.app-shell-content`. */
export function UxPageMain({
  children,
  className = "",
  gap = "default"
}: {
  children: ReactNode;
  className?: string;
  gap?: "default" | "loose";
}) {
  return (
    <AppPageShell as="main" gap={gap} className={cn("ux-pilot-page", className)}>
      {children}
    </AppPageShell>
  );
}
