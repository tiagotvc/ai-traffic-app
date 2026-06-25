"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type DsTab<T extends string = string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: number;
};

/**
 * Barra de abas em pílula (single-select) do DS — usada em telas com seções no topo
 * (ex.: Configurações). Cores via tokens → funciona em dark e light automaticamente.
 */
export function DsTabBar<T extends string = string>({
  tabs,
  active,
  onChange,
  className,
  ariaLabel,
  variant = "pill"
}: {
  tabs: DsTab<T>[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
  /** `underline` = ícone + texto + linha (mock Configurações); `pill` = pílulas preenchidas */
  variant?: "pill" | "underline";
}) {
  if (variant === "underline") {
    return (
      <nav
        className={cn(
          "flex gap-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "tab-transition inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 pb-2 pt-0.5 text-sm font-medium transition",
                isActive
                  ? "border-[var(--ui-accent)] text-[var(--ui-accent)]"
                  : "border-transparent text-[var(--text-dim)] hover:text-[var(--text-main)]"
              )}
            >
              {tab.icon ? <span className="shrink-0">{tab.icon}</span> : null}
              {tab.label}
              {typeof tab.badge === "number" && tab.badge > 0 ? (
                <span className="ml-0.5 font-normal text-[var(--text-dimmer)]">({tab.badge})</span>
              ) : null}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              isActive
                ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] shadow-sm"
                : "border-[var(--border-color)] text-[var(--text-dim)] hover:border-[var(--ui-accent-border)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-main)]"
            )}
          >
            {tab.icon ? <span className="shrink-0">{tab.icon}</span> : null}
            {tab.label}
            {typeof tab.badge === "number" && tab.badge > 0 ? (
              <span className="ml-0.5 rounded-full bg-[var(--surface-bg)] px-1.5 text-[10px] font-semibold text-[var(--text-dim)]">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
