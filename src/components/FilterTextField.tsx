"use client";

import { cn } from "@/lib/cn";

type Props = {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
  /** Select all text on focus so the first keystroke replaces the current value. */
  selectOnFocus?: boolean;
  "aria-label"?: string;
};

export function FilterTextField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  inputClassName,
  selectOnFocus = false,
  "aria-label": ariaLabel
}: Props) {
  return (
    <div
      className={cn(
        "ui-filter-text-field flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus-within:border-[var(--ui-accent)]",
        (disabled || readOnly) && "cursor-not-allowed opacity-60",
        className
      )}
      style={{
        background: "var(--filter-btn-bg)",
        borderColor: "var(--border-color)"
      }}
    >
      <span className="shrink-0" style={{ color: "var(--ui-accent)" }}>
        {icon}
      </span>
      <span
        className="mr-1 hidden shrink-0 font-body text-xs font-medium sm:inline"
        style={{ color: "var(--text-dim)" }}
      >
        {label}:
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={ariaLabel ?? label}
        className={cn(
          "min-w-0 flex-1 border-none bg-transparent font-body text-sm outline-none placeholder:text-[var(--text-dimmer)]",
          inputClassName
        )}
        style={{ color: "var(--text-main)" }}
      />
    </div>
  );
}
