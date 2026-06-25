import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { DsEyebrow } from "./DsEyebrow";

export type DsFlatSectionTone = "default" | "danger" | "amber";

/**
 * Seção flat: título + subtítulo no fundo da página, sem `ui-card` externo.
 * Referência: abas de Configurações (Geral, Plano, Equipe…).
 */
export function DsFlatSection({
  eyebrow,
  title,
  subtitle,
  titleAdornment,
  titleIcon,
  actions,
  tone = "default",
  titleClassName,
  children,
  className,
  contentClassName
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  titleAdornment?: ReactNode;
  titleIcon?: ReactNode;
  actions?: ReactNode;
  tone?: DsFlatSectionTone;
  titleClassName?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const toneBox =
    tone === "danger"
      ? "rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)] p-4"
      : tone === "amber"
        ? "rounded-xl border border-[rgba(245,166,35,0.2)] p-4"
        : undefined;

  return (
    <section className={cn("space-y-3", className)}>
      {eyebrow || title ? (
        <div
          className={cn(
            actions && "flex flex-wrap items-start justify-between gap-3"
          )}
        >
          <div className="min-w-0">
            {eyebrow ? <DsEyebrow>{eyebrow}</DsEyebrow> : null}
            {title ? (
              <div className={cn("flex items-start gap-2.5", eyebrow && "mt-2")}>
                {titleIcon ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                    {titleIcon}
                  </span>
                ) : null}
                <div className="min-w-0">
                  <h2
                    className={cn(
                      "flex items-center gap-1.5 font-heading font-semibold text-[var(--text-main)]",
                      titleClassName ?? "text-sm"
                    )}
                  >
                    {title}
                    {titleAdornment}
                  </h2>
                  {subtitle ? (
                    <p className="mt-0.5 text-xs text-[var(--text-dim)]">{subtitle}</p>
                  ) : null}
                </div>
              </div>
            ) : subtitle ? (
              <p className={cn("text-xs text-[var(--text-dim)]", eyebrow ? "mt-2" : undefined)}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(toneBox, contentClassName)}>{children}</div>
    </section>
  );
}
