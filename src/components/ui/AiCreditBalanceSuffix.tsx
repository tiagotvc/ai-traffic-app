"use client";

import { useTranslations } from "next-intl";

import { useAiCredits } from "@/hooks/useAiCredits";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  loadingClassName?: string;
};

/** Appends " · N disponíveis" when tenant balance is known (finite quota). */
export function AiCreditBalanceSuffix({ className, loadingClassName }: Props) {
  const t = useTranslations("campaignCreator");
  const { loading, balance } = useAiCredits();

  if (loading) {
    return (
      <span className={cn("opacity-60", loadingClassName ?? className)} aria-hidden>
        {" · …"}
      </span>
    );
  }

  if (!balance || balance.unlimited) return null;

  return (
    <span className={className}>
      <span aria-hidden> · </span>
      {t("aiCreditsAvailableShort", { count: balance.remaining })}
    </span>
  );
}
