"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";

type DsModalWidth = "sm" | "md" | "lg" | "xl";

const widthClass: Record<DsModalWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl"
};

/**
 * Modal canônico do DS. Reusa `UxModalPortal` (portal z-[200], blur, clique-fora, scroll-lock)
 * e adiciona: tecla Esc, cabeçalho padrão (icon-shell de accent temático + título + botão X) e
 * rodapé opcional. Use `DsButton` no `footer`.
 */
export function DsModal({
  open,
  onClose,
  title,
  subtitle,
  titleIcon,
  width = "md",
  children,
  footer,
  contentClassName,
  className
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Ícone do cabeçalho — renderizado no shell de accent (âmbar light / roxo dark). */
  titleIcon?: ReactNode;
  width?: DsModalWidth;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <UxModalPortal open={open} onClose={onClose}>
      <div
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] shadow-2xl",
          widthClass[width],
          className
        )}
      >
        {title || titleIcon ? (
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex min-w-0 items-start gap-2.5">
              {titleIcon ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                  {titleIcon}
                </span>
              ) : null}
              <div className="min-w-0">
                {title ? (
                  <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p className="mt-0.5 text-xs text-[var(--text-dim)]">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-dimmer)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-main)]"
            >
              <X size={16} />
            </button>
          </header>
        ) : null}

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", contentClassName)}>
          {children}
        </div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border-color)] px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </UxModalPortal>
  );
}
