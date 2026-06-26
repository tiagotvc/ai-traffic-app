"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAiCreditCost } from "@/hooks/useAiCreditCost";
import type { AiCreditKind } from "@/lib/ai-credits/types";

type Props = {
  kind: AiCreditKind;
  /** Estimated number of AI calls (e.g. preview + targeting). */
  calls?: number;
  className?: string;
};

export function AiCreditCostHint({ kind, calls = 1, className }: Props) {
  const t = useTranslations("campaignCreator");
  const unitCost = useAiCreditCost(kind);
  const total = unitCost * calls;

  return (
    <p
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] px-2.5 py-1 text-[11px] text-[var(--text-dim)] ${className ?? ""}`}
    >
      <Sparkles size={12} className="shrink-0 text-[var(--ui-accent)]" aria-hidden />
      {t("aiActionCreditCost", { cost: total })}
    </p>
  );
}
