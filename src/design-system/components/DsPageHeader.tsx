import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { PageTitleBlock } from "./PageTitleBlock";

export function DsPageHeader({
  title,
  subtitle,
  breadcrumbs,
  titleIcon,
  badge,
  actions,
  className
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: ReactNode;
  titleIcon?: ReactNode;
  badge?: ReactNode;
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
        <PageTitleBlock title={title} subtitle={subtitle} titleIcon={titleIcon} badge={badge} />
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
