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
};

export function DsSelectablePills<T extends string = string>({
  options,
  selected,
  onChange,
  minSelected = 1,
  className,
  size = "sm"
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
      ? "rounded-full px-3 py-1.5 text-xs font-medium transition"
      : "rounded-full px-2.5 py-1 text-[11px] font-medium transition";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {options.map((opt) => {
        const on = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={pillClass}
            style={
              on
                ? {
                    background: "rgba(245,166,35,0.12)",
                    color: "var(--amber)",
                    border: "1px solid rgba(245,166,35,0.35)"
                  }
                : {
                    background: "var(--surface-bg)",
                    color: "var(--text-dim)",
                    border: "1px solid transparent"
                  }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
