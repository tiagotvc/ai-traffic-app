"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Scopes creator card tokens for Audiences library pages (personas, zones, meta).
 */
export function AudiencesCreatorShell({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-audiences-shell className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {children}
    </div>
  );
}
