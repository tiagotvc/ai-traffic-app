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
  maxLength?: number;
  /** Renders an inset counter (e.g. 25/400) inside the field on the right. */
  showCount?: boolean;
  countFormatter?: (current: number, max: number) => string;
  /** Optional trailing slot inside the field border (after the input). */
  suffix?: React.ReactNode;
  /** Match campaign creator inset fields (FilterSelectDropdown in wizard steps). */
  creatorField?: boolean;
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
  maxLength,
  showCount = false,
  countFormatter,
  suffix,
  creatorField = false,
  "aria-label": ariaLabel
}: Props) {
  const countSuffix =
    showCount && maxLength != null ? (
      <span
        className={cn(
          "shrink-0 whitespace-nowrap pl-1 text-[10px] tabular-nums",
          value.length >= maxLength
            ? "text-amber-600 dark:text-amber-400"
            : "text-[var(--text-dimmer)]"
        )}
        aria-live="polite"
      >
        {countFormatter
          ? countFormatter(value.length, maxLength)
          : `${value.length}/${maxLength}`}
      </span>
    ) : null;

  const trailing = suffix ?? countSuffix;

  return (
    <div
      className={cn(
        "ui-filter-text-field flex w-full items-center gap-2 rounded-lg border px-3 text-sm transition-all duration-200 focus-within:border-[var(--ui-accent)]",
        creatorField
          ? "h-9 min-h-9 flex-nowrap items-center py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))]"
          : "py-2",
        (disabled || readOnly) && "cursor-not-allowed opacity-60",
        className
      )}
      style={
        creatorField
          ? undefined
          : {
              background: "var(--filter-btn-bg)",
              borderColor: "var(--border-color)"
            }
      }
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
          trailing ? "pr-0.5" : undefined,
          inputClassName
        )}
        style={{ color: "var(--text-main)" }}
        maxLength={maxLength}
      />
      {trailing}
    </div>
  );
}
