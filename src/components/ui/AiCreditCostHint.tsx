"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { AiCreditBalanceSuffix } from "@/components/ui/AiCreditBalanceSuffix";
import { useAiCreditCost } from "@/hooks/useAiCreditCost";
import type { AiCreditKind } from "@/lib/ai-credits/types";
import { cn } from "@/lib/cn";

type Props = {
  kind: AiCreditKind;
  /** Estimated number of AI calls (e.g. preview + targeting). */
  calls?: number;
  className?: string;
  /** Compact pill for tabs/buttons; default bordered hint for forms. */
  variant?: "hint" | "pill";
  /** When set, shows credits consumed on the last successful action. */
  consumed?: boolean;
  /** Override consumed amount (defaults to unit cost × calls). */
  consumedAmount?: number;
};

export function AiCreditCostHint({
  kind,
  calls = 1,
  className,
  variant = "hint",
  consumed = false,
  consumedAmount
}: Props) {
  const t = useTranslations("campaignCreator");
  const unitCost = useAiCreditCost(kind);
  const total = Math.max(1, unitCost * calls);
  const charged = consumedAmount ?? total;

  if (variant === "pill") {
    return (
      <span className={cn("ui-ai-credit-pill", className)}>
        {consumed
          ? t("aiCreditConsumedPill", { count: charged })
          : t("aiCreditCostPill", { count: total })}
        <AiCreditBalanceSuffix />
      </span>
    );
  }

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] px-2.5 py-1 text-[11px] text-[var(--text-dim)]",
        className
      )}
    >
      <Sparkles size={12} className="shrink-0 text-[var(--ui-accent)]" aria-hidden />
      {t("aiActionCreditCost", { cost: total })}
      <AiCreditBalanceSuffix />
    </p>
  );
}
