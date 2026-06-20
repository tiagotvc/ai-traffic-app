import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function DsSectionHeader({
  title,
  description,
  actions,
  className
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-start justify-between gap-2", className)}>
      <div>
        <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
