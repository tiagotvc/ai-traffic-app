import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Canonical page title row — matches Campaign Creator header typography.
 * Icon shell + bold title + optional badge, subtitle below.
 */
export function PageTitleBlock({
  title,
  subtitle,
  titleIcon,
  badge,
  subtitleClassName,
  className
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  titleIcon?: ReactNode;
  badge?: ReactNode;
  subtitleClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-2">
        {titleIcon ? <div className="ui-toolbar-icon-shell">{titleIcon}</div> : null}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {typeof title === "string" ? (
            <h1 className="font-heading text-base font-bold leading-tight text-[var(--text-main)] lg:text-xl">
              {title}
            </h1>
          ) : (
            title
          )}
          {badge}
        </div>
      </div>
      {subtitle ? (
        <div
          className={cn(
            "mt-1 font-body text-xs leading-snug text-[var(--text-dim)] lg:text-sm",
            subtitleClassName
          )}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
