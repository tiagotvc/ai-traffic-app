export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} aria-hidden />;
}

/** Linha de cards (KPIs/destaques). */
export function CardsRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-5" style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}>
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
    <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

/** Faixa de métricas de apoio (grid de stats). */
export function SupportStripSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="ui-card overflow-hidden">
      <div className="border-b border-[var(--border-color)] px-4 py-2.5">
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border-color)] sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Lista de itens em duas linhas (ex.: alertas). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="ui-card divide-y divide-[var(--border-color)] overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export type SkelCol = "media" | "text" | "wide" | "badge" | "select" | "metric" | "chips";

function SkelCell({ kind }: { kind: SkelCol }) {
  switch (kind) {
    case "media":
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <Skeleton className="h-3.5 w-40 max-w-full" />
        </div>
      );
    case "wide":
      return <Skeleton className="h-3.5 w-48 max-w-full" />;
    case "badge":
      return <Skeleton className="h-5 w-16 rounded-full" />;
    case "select":
      return <Skeleton className="h-7 w-24 rounded-lg" />;
    case "metric":
      return (
        <div className="flex justify-end">
          <Skeleton className="h-3.5 w-12" />
        </div>
      );
    case "chips":
      return (
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-10 rounded-md" />
        </div>
      );
    case "text":
    default:
      return <Skeleton className="h-3.5 w-24" />;
  }
}

/**
 * Tabela skeleton. Com `columns`, espelha o cabeçalho/colunas reais;
 * sem `columns`, cai num estilo de lista (avatar + 2 linhas + valor).
 */
export function TableSkeleton({
  rows = 5,
  columns,
  head = true,
  bare = false,
  className = ""
}: {
  rows?: number;
  columns?: SkelCol[];
  head?: boolean;
  bare?: boolean;
  className?: string;
}) {
  if (!columns) {
    return (
      <div className={`ui-card divide-y divide-[var(--border-color)] overflow-hidden ${className}`}>
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

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        {head ? (
            <thead className="bg-[var(--surface-thead)]">
              <tr>
                {columns.map((c, i) => (
                  <th key={i} className={`px-4 py-2 ${c === "metric" ? "text-right" : ""}`}>
                    <Skeleton className={`h-3 ${c === "metric" ? "ml-auto w-10" : "w-20"}`} />
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
        <tbody className="divide-y divide-[var(--border-color)]">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {columns.map((c, i) => (
                <td key={i} className="px-4 py-3 align-middle">
                  <SkelCell kind={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (bare) return table;
  return <div className={`ui-card overflow-hidden ${className}`}>{table}</div>;
}
