"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";
import { getPopoverFixedStyle, POPOVER_GAP, resolvePopoverPlacement } from "@/lib/popover-position";

export type FilterSelectOption = {
  value: string;
  label: string;
};

const MENU_MAX_HEIGHT = 320;
const MENU_Z_INDEX = 100;

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
  usePortal?: boolean;
  className?: string;
  buttonClassName?: string;
  valueClassName?: string;
  /** Match campaign creator inset fields (FilterTextField in wizard steps). */
  creatorField?: boolean;
  /** Shown in the menu when `options` is empty. */
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
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
  usePortal = true,
  className,
  buttonClassName,
  valueClassName,
  creatorField = false,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction
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
      const emptyRows =
        options.length === 0 && emptyMessage ? 1 + (onEmptyAction && emptyActionLabel ? 1 : 0) : 0;
      const estimatedHeight = Math.min(
        (options.length + (clearable ? 1 : 0) + emptyRows) * 40,
        MENU_MAX_HEIGHT
      );
      const placement = resolvePopoverPlacement(trigger, estimatedHeight, menuPlacement);
      setResolvedPlacement(placement);
      setMenuStyle(
        getPopoverFixedStyle(trigger, placement, {
          gap: POPOVER_GAP,
          width: "trigger",
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
  }, [open, usePortal, menuPlacement, options.length, clearable, emptyMessage, emptyActionLabel, onEmptyAction]);

  const selectedLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : placeholder;

  const menu = open ? (
    <div
      ref={usePortal ? menuRef : undefined}
      className={cn(
        "overflow-hidden rounded-lg border shadow-2xl",
        usePortal
          ? "filter-select-menu--portal max-h-80 overflow-y-auto"
          : cn("absolute left-0 z-50 w-full", menuPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1")
      )}
      style={{
        background: "var(--dropdown-bg, var(--surface-card))",
        borderColor: "var(--border-color)",
        ...(usePortal ? menuStyle : {})
      }}
      data-placement={usePortal ? resolvedPlacement : menuPlacement}
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
      {options.length === 0 && emptyMessage ? (
        <p
          className="px-3 py-2 font-body text-sm leading-relaxed"
          style={{ color: "var(--text-dim)" }}
        >
          {emptyMessage}
        </p>
      ) : null}
      {options.length === 0 && onEmptyAction && emptyActionLabel ? (
        <button
          type="button"
          onClick={() => {
            onEmptyAction();
            setOpen(false);
          }}
          className="block w-full px-3 py-2 text-left font-body text-sm font-medium transition-colors"
          style={{ color: "var(--ui-accent)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "";
          }}
        >
          {emptyActionLabel}
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
  ) : null;

  return (
    <div ref={ref} className={cn("relative", className?.includes("w-full") ? "block w-full" : "inline-block w-full xl:w-auto", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-all duration-200",
          creatorField &&
            "shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))]",
          creatorField && open && "border-[var(--ui-accent)]",
          disabled && "cursor-not-allowed opacity-60",
          buttonClassName
        )}
        style={{
          color: "var(--text-main)",
          ...(!creatorField
            ? {
                background: "var(--filter-btn-bg)",
                borderColor: open ? "var(--ui-accent)" : "var(--border-color)"
              }
            : {})
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
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-body text-sm max-w-[88px] sm:max-w-[140px]",
            valueClassName
          )}
        >
          {selectedLabel}
        </span>
        <ChevronDown
          size={14}
          className={cn("ml-auto shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-dim)" }}
        />
      </button>
      {usePortal && mounted && menu ? createPortal(menu, document.body) : menu}
    </div>
  );
}
