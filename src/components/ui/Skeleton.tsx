export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} aria-hidden />;
}

/** Linha de cards (KPIs/destaques). */
export function CardsRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ui-card space-y-3 p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-14 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Card com gráfico. */
export function ChartCardSkeleton() {
  return (
    <div className="ui-card space-y-3 p-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

/** Tabela/lista (linhas com avatar + textos). */
export function TableSkeleton({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`ui-card divide-y divide-slate-100 overflow-hidden ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
