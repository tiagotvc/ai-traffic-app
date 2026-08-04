"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";

type DsSlideOverWidth = "sm" | "md" | "lg";

const widthClass: Record<DsSlideOverWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl"
};

/**
 * Painel lateral direito do DS — irmão do `DsModal`, mesma base (`UxModalPortal`: portal
 * z-[200], clique-fora, scroll-lock), mas ancorado à direita (`variant="right"`) em vez de
 * centralizado. Primeiro uso: Commander fora do criador de campanha.
 */
export function DsSlideOver({
  open,
  onClose,
  title,
  subtitle,
  titleIcon,
  width = "md",
  children,
  footer,
  headerExtra,
  contentClassName,
  className
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  titleIcon?: ReactNode;
  width?: DsSlideOverWidth;
  children: ReactNode;
  footer?: ReactNode;
  /** Ações extras no cabeçalho, entre o título e o botão de fechar. */
  headerExtra?: ReactNode;
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
    <UxModalPortal open={open} onClose={onClose} variant="right">
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden border-l border-[var(--border-color)] bg-[var(--surface-card)] shadow-2xl",
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
                  <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h2>
                ) : null}
                {subtitle ? <p className="mt-0.5 text-xs text-[var(--text-dim)]">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {headerExtra}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--btn-radius-icon)] text-[var(--text-dimmer)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-main)]"
              >
                <X size={16} />
              </button>
            </div>
          </header>
        ) : null}

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", contentClassName)}>{children}</div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border-color)] px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </UxModalPortal>
  );
}
