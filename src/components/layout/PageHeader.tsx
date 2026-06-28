import type { ReactNode } from "react";

import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  titleIcon,
  badge,
  actions
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: ReactNode;
  titleIcon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs ? (
          <div className="mb-1 text-xs font-medium text-[var(--text-dim)]">{breadcrumbs}</div>
        ) : null}
        <PageTitleBlock title={title} subtitle={subtitle} titleIcon={titleIcon} badge={badge} />
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
