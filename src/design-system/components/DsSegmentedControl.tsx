"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type DsSegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  badge?: ReactNode;
};

export function DsSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel
}: {
  value: T;
  onChange: (value: T) => void;
  options: DsSegmentedOption<T>[];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-lg border border-[var(--border-color)] bg-black/20 p-1", className)}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative overflow-visible rounded-md px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)] shadow-sm"
                : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
            )}
          >
            {option.label}
            {option.badge ? (
              <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black leading-none text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
                {option.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
