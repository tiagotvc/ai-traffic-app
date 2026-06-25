"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";

export type FilterSelectOption = {
  value: string;
  label: string;
};

type Props = {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  options: FilterSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  menuPlacement?: "bottom" | "top";
  /** When false, hides the placeholder row in the menu (no clear-to-empty). Default true. */
  clearable?: boolean;
  className?: string;
};

export function FilterSelectDropdown({
  icon,
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  menuPlacement = "bottom",
  clearable = true,
  className
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDismissOnOutsideClick(ref, open, () => setOpen(false));

  const selectedLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : placeholder;

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-all duration-200",
          disabled && "cursor-not-allowed opacity-60"
        )}
        style={{
          color: "var(--text-main)",
          background: "var(--filter-btn-bg)",
          borderColor: open ? "var(--ui-accent)" : "var(--border-color)"
        }}
        aria-expanded={open}
      >
        <span className="shrink-0" style={{ color: "var(--ui-accent)" }}>
          {icon}
        </span>
        <span
          className="mr-1 hidden font-body text-xs font-medium sm:inline"
          style={{ color: "var(--text-dim)" }}
        >
          {label}:
        </span>
        <span className="max-w-[88px] truncate font-body text-sm sm:max-w-[140px]">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={cn("ml-auto shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-dim)" }}
        />
      </button>
      {open ? (
        <div
          className={cn(
            "absolute left-0 z-50 w-full overflow-hidden rounded-lg border shadow-2xl",
            menuPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          )}
          style={{
            background: "var(--dropdown-bg, var(--surface-card))",
            borderColor: "var(--border-color)"
          }}
        >
          {clearable ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left font-body text-sm transition-colors"
            style={{
              color: !value ? "var(--ui-accent)" : "var(--text-dim)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "";
            }}
          >
            {placeholder}
          </button>
          ) : null}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left font-body text-sm transition-colors"
              style={{
                color: value === opt.value ? "var(--ui-accent)" : "var(--text-dim)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
