"use client";

import { cn } from "@/lib/cn";

type Props = {
  used: number;
  max: number;
  className?: string;
};

/** Barra de progresso do saldo de crédito de IA — substitui o texto plano "X restantes de Y". */
export function AiCreditMeterBar({ used, max, className }: Props) {
  if (max < 0) return null;

  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const atLimit = used >= max;
  const nearLimit = !atLimit && pct >= 80;

  return (
    <div
      className={cn(
        "h-1.5 w-full min-w-[96px] overflow-hidden rounded-full bg-[var(--border-color)]",
        className
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          atLimit ? "bg-red-500" : nearLimit ? "bg-amber-500" : "bg-[var(--ui-accent)]"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
