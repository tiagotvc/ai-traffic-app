"use client";

export function DashboardGridSkeleton({ variant = "view" }: { variant?: "view" | "edit" }) {
  if (variant === "edit") {
    return (
      <div className="flex h-full min-h-[480px] flex-col gap-3">
        <div className="skeleton-shimmer h-14 shrink-0 rounded-lg" />
        <div className="skeleton-shimmer min-h-0 flex-1 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-[5.5rem] rounded-xl" />
        ))}
      </div>
      <div className="col-span-12 skeleton-shimmer h-80 rounded-xl lg:col-span-8" />
      <div className="col-span-12 skeleton-shimmer h-80 rounded-xl lg:col-span-4" />
      <div className="col-span-12 skeleton-shimmer h-64 rounded-xl" />
    </div>
  );
}
