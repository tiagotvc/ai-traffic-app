"use client";

import { Filter } from "lucide-react";

import { IconLabelButton } from "@/components/ui/IconLabelButton";
import { cn } from "@/lib/cn";

type FilterToggleButtonProps = Omit<
  React.ComponentProps<typeof IconLabelButton>,
  "label" | "icon"
> & {
  open: boolean;
  showLabel: string;
  hideLabel: string;
  icon?: React.ReactNode;
  /** Badge quando há filtros aplicados com painel fechado. */
  activeCount?: number;
};

export function FilterToggleButton({
  open,
  showLabel,
  hideLabel,
  icon,
  activeCount,
  className,
  ...props
}: FilterToggleButtonProps) {
  const label = open ? hideLabel : showLabel;

  return (
    <IconLabelButton
      label={label}
      icon={
        icon ?? (
          <span className="relative inline-flex">
            <Filter size={16} />
            {!open && activeCount != null && activeCount > 0 ? (
              <span
                className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold"
                style={{
                  background: "var(--ui-accent)",
                  color: "var(--ui-accent-btn-text)"
                }}
              >
                {activeCount}
              </span>
            ) : null}
          </span>
        )
      }
      aria-expanded={open}
      aria-pressed={open}
      className={cn(
        "ui-btn-filter-toggle font-heading",
        open && "ui-btn-filter-toggle--open",
        className
      )}
      {...props}
    />
  );
}
