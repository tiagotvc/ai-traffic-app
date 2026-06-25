import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Empty state flat — ícone accent + título + descrição (ex.: Histórico vazio). */
export function DsFlatEmptyState({
  icon,
  title,
  description,
  bordered = true,
  variant = "flat",
  className
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Borda superior (padrão em listas flat). */
  bordered?: boolean;
  /** `card` = caixa com borda arredondada (ex.: Histórico vazio). */
  variant?: "flat" | "card";
  className?: string;
}) {
  const isCard = variant === "card";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        isCard
          ? "rounded-xl border border-[var(--border-color)] py-16"
          : cn("py-14", bordered && "border-t border-[var(--border-color)]"),
        className
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]",
          isCard ? "mb-4 h-14 w-14 rounded-2xl" : "mb-3 h-12 w-12 rounded-xl"
        )}
        style={isCard ? { boxShadow: "0 0 32px var(--ui-accent-glow)" } : undefined}
      >
        {icon}
      </span>
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--text-dim)]">{description}</p>
      ) : null}
    </div>
  );
}
