import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Container flat para painéis de configuração / preferências.
 * Espaçamento vertical padrão entre blocos (`space-y-8`).
 */
export function DsFlatPanel({
  children,
  centered = false,
  className
}: {
  children: ReactNode;
  /** Constrain to `--app-content-max-width` (full app width). Prefer unset for hub screens. */
  centered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-8",
        centered && "mx-auto w-full max-w-[var(--app-content-max-width)]",
        className
      )}
    >
      {children}
    </div>
  );
}
