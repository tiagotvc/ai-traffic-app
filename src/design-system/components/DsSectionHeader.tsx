import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function DsSectionHeader({
  title,
  description,
  actions,
  icon,
  className
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Ícone opcional — renderizado no shell de accent temático (âmbar light / roxo dark). */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-start justify-between gap-2", className)}>
      <div className="flex items-start gap-2">
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">{description}</p>
          ) : null}
        </div>
      </div>
      {actions}
    </div>
  );
}
