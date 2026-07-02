"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Card seletor canônico do Campaign Creator, com checker no canto superior direito. */
export function DsCheckerCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  compact = false,
  inline = false,
  className
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  compact?: boolean;
  inline?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-objective-card group",
        compact && "campaign-creator-objective-card--compact",
        inline && "!min-h-[4.5rem] !w-full !flex-row !items-center !justify-start !gap-3 !rounded-xl !px-3 !py-2.5",
        selected && "campaign-creator-objective-card--selected",
        className
      )}
    >
      <span className="campaign-creator-objective-card__check" aria-hidden>
        {selected ? <Check size={12} strokeWidth={3} /> : null}
      </span>
      <span className={cn("campaign-creator-objective-card__icon", inline && "!h-8 !w-8 !rounded-lg")}>{icon}</span>
      <span
        className={cn(
          "font-heading font-semibold text-[var(--text-main)]",
          inline ? "!mt-0 text-left text-xs" : compact ? "mt-1.5 text-center text-xs" : "mt-3 text-sm"
        )}
      >
        {title}
      </span>
      {description ? (
        <span
          className={cn(
            "text-[var(--text-dim)]",
            inline ? "!mt-0 ml-auto pr-5 text-[10px]" : compact ? "mt-1 text-center text-[10px] leading-snug" : "mt-1.5 pr-6 text-[11px] leading-relaxed"
          )}
        >
          {description}
        </span>
      ) : null}
    </button>
  );
}
