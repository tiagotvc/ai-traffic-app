"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Shown before the field on sm+ (same pattern as filter dropdowns). */
  label?: string;
  disabled?: boolean;
  className?: string;
  /** default: standard toolbar width; wide: grows in flex rows; compact: dense filter rows */
  size?: "default" | "wide" | "compact";
  inputType?: "search" | "text";
  "aria-label"?: string;
};

export function FilterSearchInput({
  value,
  onChange,
  placeholder,
  label,
  disabled = false,
  className,
  size = "default",
  inputType = "search",
  "aria-label": ariaLabel
}: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus-within:border-[var(--ui-accent)]",
        size === "default" && "min-w-[240px] sm:min-w-[280px]",
        size === "wide" && "min-w-[260px] flex-1 sm:min-w-[300px]",
        size === "compact" && "min-w-[8rem] sm:min-w-[10rem]",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      style={{
        background: "var(--filter-btn-bg)",
        borderColor: "var(--border-color)"
      }}
    >
      <Search size={14} className="shrink-0" style={{ color: "var(--ui-accent)" }} aria-hidden />
      {label ? (
        <span
          className="mr-1 hidden shrink-0 font-body text-xs font-medium sm:inline"
          style={{ color: "var(--text-dim)" }}
        >
          {label}:
        </span>
      ) : null}
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        className="min-w-0 flex-1 border-none bg-transparent font-body text-sm outline-none placeholder:text-[var(--text-dimmer)]"
        style={{ color: "var(--text-main)" }}
      />
    </div>
  );
}
