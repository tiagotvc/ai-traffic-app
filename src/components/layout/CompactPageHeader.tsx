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
        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
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
