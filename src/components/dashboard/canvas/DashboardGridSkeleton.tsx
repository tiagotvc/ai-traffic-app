"use client";

export function DashboardGridSkeleton() {
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
