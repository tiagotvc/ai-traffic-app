import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Label superior em caps — ex.: "SEU PLANO ATUAL", "PRÓXIMA RENOVAÇÃO". */
export function DsEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dimmer)]",
        className
      )}
    >
      {children}
    </p>
  );
}
