"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";

export type FormSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  className?: string;
  id?: string;
};

export function FormSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  clearable = true,
  className,
  id
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDismissOnOutsideClick(ref, open, () => setOpen(false));

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const isDisabled = disabled || loading;

  if (loading) {
    return (
      <div
        ref={ref}
        className={cn("relative w-full", className)}
        aria-busy="true"
        aria-label={placeholder}
      >
        <div className="skeleton-shimmer h-[2.625rem] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      <button
        id={id}
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && setOpen((o) => !o)}
        className={cn(
          "ui-form-select-trigger flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm shadow-sm transition-all",
          isDisabled && "cursor-not-allowed opacity-60",
          open && "ui-form-select-trigger--open"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-body",
            selected ? "text-[var(--text-main)]" : "text-[var(--text-dimmer)]"
          )}
        >
          {loading ? placeholder : displayLabel}
        </span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-dim)" }}
        />
      </button>
      {open && !isDisabled ? (
        <div
          role="listbox"
          className="ui-form-select-menu absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border shadow-xl"
        >
          {clearable ? (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn("ui-form-select-option w-full text-left", !value && "ui-form-select-option--active")}
            >
              {placeholder}
            </button>
          ) : null}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "ui-form-select-option w-full text-left",
                value === opt.value && "ui-form-select-option--active"
              )}
            >
              <span className="block truncate font-body text-sm">{opt.label}</span>
              {opt.hint ? (
                <span className="mt-0.5 block truncate font-body text-[11px] text-[var(--text-dimmer)]">
                  {opt.hint}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
