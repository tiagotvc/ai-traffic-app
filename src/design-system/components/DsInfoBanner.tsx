import type { ReactNode } from "react";
import { Info, Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

/** Contextual info strip — purple accent, aligned with ui-alert-learnings / Campaign Creator inset cards. */
export function DsInfoBanner({
  children,
  className,
  icon,
  showIcon = true,
  loading = false,
  actions,
  role = "status"
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  showIcon?: boolean;
  loading?: boolean;
  actions?: ReactNode;
  role?: "status" | "note" | undefined;
}) {
  return (
    <div
      className={cn(
        "ui-alert-info flex w-full items-center gap-2.5",
        actions ? "justify-between" : undefined,
        className
      )}
      role={role}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {showIcon ? (
          loading ? (
            <Loader2 size={16} className="ui-alert-info__icon shrink-0 animate-spin" aria-hidden />
          ) : (
            icon ?? <Info size={16} className="ui-alert-info__icon shrink-0" aria-hidden />
          )
        ) : null}
        <div className="min-w-0 flex-1 leading-snug">{children}</div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
