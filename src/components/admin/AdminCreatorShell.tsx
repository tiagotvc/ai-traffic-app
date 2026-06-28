"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Scopes creator card tokens (`--creator-card-*`) for platform admin surfaces
 * (users, billing, contacts, feature flags, theme).
 */
export function AdminCreatorShell({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-admin-shell className={cn("campaign-creator-section-stack", className)}>
      {children}
    </div>
  );
}
