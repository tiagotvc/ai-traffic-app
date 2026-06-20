import type { ReactNode } from "react";

export function CompactPageHeader({
  title,
  subtitle,
  actions,
  badge
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h1 className="font-heading text-lg font-bold tracking-tight text-[var(--text-main)] sm:text-xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-0.5 text-xs text-[var(--text-dim)]">{subtitle}</p> : null}
      </div>
      {badge || actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {badge}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
