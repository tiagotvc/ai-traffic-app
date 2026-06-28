"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Scopes creator card tokens (`--creator-card-*`) for Agency Brain feeds
 * (Aprendizados, Hipóteses) and related surfaces.
 */
export function AgencyBrainCreatorShell({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-agency-brain-shell className={cn("space-y-5", className)}>
      {children}
    </div>
  );
}
