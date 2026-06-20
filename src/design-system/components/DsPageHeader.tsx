import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function DsPageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {breadcrumbs ? (
          <div className="mb-1 text-xs font-medium text-[var(--text-dim)]">{breadcrumbs}</div>
        ) : null}
        <h1 className="font-heading font-heading text-2xl font-bold tracking-tight text-[var(--text-main)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--text-dim)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
