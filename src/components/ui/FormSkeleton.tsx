"use client";

import { cn } from "@/lib/cn";

export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl", className)}
      style={{ background: "var(--border-color)", opacity: 0.45, height: "2.5rem" }}
      aria-hidden
    />
  );
}

export function FormBlockSkeleton({ rows = 3, ariaLabel }: { rows?: number; ariaLabel?: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={ariaLabel}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-2">
          <div
            className="h-3 w-24 animate-pulse rounded-md"
            style={{ background: "var(--border-color)", opacity: 0.35 }}
          />
          <FormFieldSkeleton />
        </div>
      ))}
    </div>
  );
}
