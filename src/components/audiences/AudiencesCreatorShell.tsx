"use client";

import type { ReactNode } from "react";

import { AudienceScopeProvider } from "@/components/audiences/AudienceScopeContext";
import { cn } from "@/lib/cn";

/**
 * Scopes creator card tokens for Audiences library pages (personas, zones, meta),
 * and provides the shared client/ad-account scope to every `/audiences/*` route.
 */
export function AudiencesCreatorShell({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <AudienceScopeProvider>
      <div data-audiences-shell className={cn("flex min-h-0 flex-1 flex-col", className)}>
        {children}
      </div>
    </AudienceScopeProvider>
  );
}
