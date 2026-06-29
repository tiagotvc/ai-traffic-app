"use client";

import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  message?: string;
  className?: string;
  /** Menos padding — ideal dentro de shells de tabela. */
  compact?: boolean;
};

/** Loader de área com identidade Orion (anel + logo + shimmer). */
export function OrionScreenLoader({ title, message, className, compact = false }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-10" : "px-6 py-16",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          "orion-action-loading__logo-wrap relative mx-auto flex items-center justify-center",
          compact ? "mb-4 min-h-[4.5rem]" : "mb-6 min-h-[5.5rem]"
        )}
      >
        <span className="orion-action-loading__ring" aria-hidden />
        <span className="orion-action-loading__ring orion-action-loading__ring--delayed" aria-hidden />
        <div className="orion-action-loading__logo relative z-10 flex items-center justify-center rounded-2xl bg-[var(--surface-thead)] px-4 py-3">
          <OrionAgencyLogo size={compact ? "sm" : "md"} variant="dark" />
        </div>
      </div>

      <p className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</p>
      {message ? <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--text-dim)]">{message}</p> : null}

      <div className="orion-action-loading__shimmer-track mx-auto mt-5 h-1 w-36 overflow-hidden rounded-full">
        <div className="orion-action-loading__shimmer-bar h-full w-1/2 rounded-full" />
      </div>
    </div>
  );
}
