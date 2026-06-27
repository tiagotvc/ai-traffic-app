"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";
import { getPopoverFixedStyle, POPOVER_GAP, resolvePopoverPlacement } from "@/lib/popover-position";

export type FormSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

const MENU_MAX_HEIGHT = 240;
const MENU_Z_INDEX = 100;

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
  menuPlacement?: "bottom" | "top";
  usePortal?: boolean;
  "aria-label"?: string;
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
  id,
  menuPlacement = "bottom",
  usePortal = true,
  "aria-label": ariaLabel
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState<"top" | "bottom">("bottom");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismissOnOutsideClick(ref, open, () => setOpen(false), usePortal ? menuRef : undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !usePortal || !ref.current) return;

    function updateMenuPosition() {
      const trigger = ref.current;
      if (!trigger) return;
      const placement = resolvePopoverPlacement(trigger, MENU_MAX_HEIGHT, menuPlacement);
      setResolvedPlacement(placement);
      setMenuStyle(
        getPopoverFixedStyle(trigger, placement, {
          gap: POPOVER_GAP,
          zIndex: MENU_Z_INDEX
        })
      );
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, usePortal, menuPlacement]);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const isDisabled = disabled || loading;

  const menu =
    open && !isDisabled ? (
      <div
        ref={usePortal ? menuRef : undefined}
        role="listbox"
        className={cn(
          "ui-form-select-menu max-h-60 overflow-y-auto rounded-xl border shadow-xl",
          usePortal
            ? "ui-form-select-menu--portal"
            : cn("absolute left-0 right-0 z-50", menuPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1")
        )}
        style={usePortal ? menuStyle : undefined}
        data-placement={usePortal ? resolvedPlacement : menuPlacement}
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
    ) : null;

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
        aria-label={ariaLabel}
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
      {usePortal && mounted && menu ? createPortal(menu, document.body) : menu}
    </div>
  );
}
