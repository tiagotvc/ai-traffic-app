"use client";

import { cn } from "@/lib/cn";

export type DsPillOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string = string> = {
  options: DsPillOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  /** Minimum selected count (default 1). */
  minSelected?: number;
  className?: string;
  size?: "sm" | "md";
  /** Use Campaign Creator chip surfaces instead of dashboard metric chips. */
  surface?: "dashboard" | "creator";
};

export function DsSelectablePills<T extends string = string>({
  options,
  selected,
  onChange,
  minSelected = 1,
  className,
  size = "sm",
  surface = "dashboard"
}: Props<T>) {
  function toggle(value: T) {
    if (selected.includes(value)) {
      if (selected.length <= minSelected) return;
      onChange(selected.filter((v) => v !== value));
      return;
    }
    onChange([...selected, value]);
  }

  const pillClass =
    size === "md"
      ? "rounded-lg px-3 py-1.5 text-xs font-medium transition border"
      : surface === "creator"
        ? "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition"
        : "dashboard-metric-chip rounded-lg px-2.5 py-1 text-[11px] font-medium transition border";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {options.map((opt) => {
        const on = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              pillClass,
              on
                ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                : "border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] text-[var(--text-dim)] hover:border-[var(--ui-accent-border)]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
