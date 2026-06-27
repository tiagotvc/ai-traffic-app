"use client";

import { cn } from "@/lib/cn";

export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("skeleton-shimmer h-10 w-full rounded-xl", className)}
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
            className="h-3 w-24 rounded-md skeleton-shimmer"
            aria-hidden
          />
          <FormFieldSkeleton />
        </div>
      ))}
    </div>
  );
}
