"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import { useAiCreditCost } from "@/hooks/useAiCreditCost";
import { useAiCredits } from "@/hooks/useAiCredits";
import type { AiCreditKind } from "@/lib/ai-credits/types";
import { cn } from "@/lib/cn";

export type CreationModeAiCredits = {
  kind: AiCreditKind;
  calls?: number;
};

function AiCreditModeFloatBadge({ kind, calls = 1 }: CreationModeAiCredits) {
  const t = useTranslations("campaignCreator");
  const unitCost = useAiCreditCost(kind);
  const total = Math.max(1, unitCost * calls);
  const { loading, balance } = useAiCredits();

  return (
    <div className="creation-mode-credit-float" aria-hidden>
      <span className="creation-mode-credit-float__cost">
        {t("aiCreditCostPill", { count: total })}
      </span>
      {loading ? (
        <span className="creation-mode-credit-float__balance opacity-60">…</span>
      ) : balance && !balance.unlimited ? (
        <>
          <span className="creation-mode-credit-float__dot" aria-hidden>
            ·
          </span>
          <span className="creation-mode-credit-float__balance">
            {t("aiCreditsAvailableShort", { count: balance.remaining })}
          </span>
        </>
      ) : null}
    </div>
  );
}

type CardProps = {
  selected: boolean;
  label: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
  aiCredits?: CreationModeAiCredits;
  className?: string;
};

/** Card quadrado de escolha de modo (manual / IA) — padrão campanha, persona, zona, relatórios. */
export function CreationModeChoiceCard({
  selected,
  label,
  description,
  icon: Icon,
  onSelect,
  aiCredits,
  className
}: CardProps) {
  return (
    <div
      className={cn(
        "creation-mode-choice-card-wrap relative h-full w-full",
        aiCredits && "creation-mode-choice-card-wrap--with-credits"
      )}
    >
      {aiCredits ? <AiCreditModeFloatBadge kind={aiCredits.kind} calls={aiCredits.calls} /> : null}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--mode-tile h-full w-full",
          selected
            ? "campaign-creator-budget-choice-card--selected"
            : "campaign-creator-budget-choice-card--unselected",
          className
        )}
      >
        <ChoiceCardCheck selected={selected} />
        <span
          className={cn(
            "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--mode-tile",
            selected
              ? "campaign-creator-budget-choice-card__icon--selected"
              : "campaign-creator-budget-choice-card__icon--unselected"
          )}
          aria-hidden
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span className="campaign-creator-budget-choice-card__content campaign-creator-budget-choice-card__content--mode-tile">
          <span className="campaign-creator-budget-choice-card__label">{label}</span>
          <span className="campaign-creator-budget-choice-card__description">{description}</span>
        </span>
      </button>
    </div>
  );
}

type GridProps = {
  children: ReactNode;
  /** Rótulo acessível do grupo */
  ariaLabel: string;
  className?: string;
};

/** Grid responsivo para 1–3 cards de modo. */
export function CreationModeChoiceGrid({ children, ariaLabel, className }: GridProps) {
  return (
    <div
      className={cn("creation-mode-choice-grid", className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

/** Largura do modal conforme quantidade de opções (visual mais quadrado). */
export function creationModeModalMaxWidthClass(optionCount: number) {
  if (optionCount >= 3) return "max-w-2xl";
  if (optionCount === 2) return "max-w-lg";
  return "max-w-md";
}
