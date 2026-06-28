import type { ReactNode } from "react";

import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";

export function CompactPageHeader({
  title,
  subtitle,
  titleIcon,
  actions,
  badge
}: {
  title: string;
  subtitle?: string;
  titleIcon?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <PageTitleBlock title={title} subtitle={subtitle} titleIcon={titleIcon} badge={badge} />
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>
      ) : null}
    </div>
  );
}
