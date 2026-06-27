import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export function ChoiceCardCheck({
  selected,
  compact
}: {
  selected: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "campaign-creator-budget-choice-card__check",
        compact && "campaign-creator-budget-choice-card__check--compact"
      )}
      aria-hidden
    >
      {selected ? <Check size={compact ? 8 : 10} strokeWidth={3} /> : null}
    </span>
  );
}

type MultiSelectChoiceCardProps = {
  selected: boolean;
  label: string;
  icon?: LucideIcon;
  iconInline?: boolean;
  disabled?: boolean;
  onToggle: () => void;
  size?: "md" | "sm";
};

export function MultiSelectChoiceCard({
  selected,
  label,
  icon: Icon,
  iconInline,
  disabled,
  onToggle,
  size = "md"
}: MultiSelectChoiceCardProps) {
  const isCompact = size === "sm";
  const useTile = Boolean(Icon && !isCompact && !iconInline);

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "campaign-creator-budget-choice-card",
        useTile
          ? "campaign-creator-budget-choice-card--tile"
          : isCompact
            ? "campaign-creator-budget-choice-card--chip-sm"
            : "campaign-creator-budget-choice-card--chip",
        Icon && iconInline && "campaign-creator-budget-choice-card--chip-with-icon",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} compact={isCompact} />
      {Icon && useTile ? (
        <span
          className={cn(
            "campaign-creator-budget-choice-card__icon",
            selected
              ? "campaign-creator-budget-choice-card__icon--selected"
              : "campaign-creator-budget-choice-card__icon--unselected"
          )}
          aria-hidden
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
      ) : Icon && iconInline ? (
        <span
          className={cn(
            "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--chip-inline",
            selected
              ? "campaign-creator-budget-choice-card__icon--selected"
              : "campaign-creator-budget-choice-card__icon--unselected"
          )}
          aria-hidden
        >
          <Icon size={isCompact ? 12 : 14} strokeWidth={1.75} />
        </span>
      ) : null}
      <span className="campaign-creator-budget-choice-card__label">{label}</span>
    </button>
  );
}
