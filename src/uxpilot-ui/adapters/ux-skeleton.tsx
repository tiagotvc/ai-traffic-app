"use client";

export function UxPageHeaderSkeleton({ width = "w-48" }: { width?: string }) {
  return <div className={`skeleton-shimmer h-10 ${width} rounded-lg`} />;
}

export function UxCardSkeleton({ className = "h-24" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

export function UxChartSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <UxCardSkeleton className={`lg:col-span-2 ${tall ? "h-64" : "h-52"}`} />
      <UxCardSkeleton className={tall ? "h-64" : "h-52"} />
    </div>
  );
}

export function UxKpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <UxCardSkeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export function UxListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <UxCardSkeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

export function UxReportsPageSkeleton() {
  return (
    <main className="flex-1 space-y-4 px-4 py-5 md:px-6">
      <UxPageHeaderSkeleton width="w-56" />
      <UxChartSkeleton tall />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <UxCardSkeleton key={i} className="h-24" />
        ))}
      </div>
      <UxCardSkeleton className="h-72" />
    </main>
  );
}

export function UxSettingsPageSkeleton() {
  return (
    <main className="flex-1 space-y-4 px-4 py-5 md:px-6">
      <UxPageHeaderSkeleton width="w-44" />
      <div className="flex flex-col gap-5 md:flex-row">
        <UxCardSkeleton className="h-64 w-full md:w-52 shrink-0" />
        <UxCardSkeleton className="h-96 flex-1" />
      </div>
    </main>
  );
}

export function UxAutomationsPageSkeleton() {
  return (
    <main className="flex-1 space-y-4 px-4 py-5 md:px-6">
      <UxPageHeaderSkeleton width="w-52" />
      <UxCardSkeleton className="h-36" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <UxCardSkeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <UxCardSkeleton key={i} className="h-44" />
        ))}
      </div>
    </main>
  );
}
