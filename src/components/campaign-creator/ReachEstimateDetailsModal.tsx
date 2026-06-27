"use client";

import { Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import type { ReachEstimateTier } from "@/hooks/useTargetingReachEstimate";

type ReachEstimateDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  usersLowerBound: number;
  usersUpperBound: number;
  tier: ReachEstimateTier;
};

function formatReach(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(n);
}

function formatFull(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function ReachEstimateDetailsModal({
  open,
  onClose,
  usersLowerBound,
  usersUpperBound,
  tier
}: ReachEstimateDetailsModalProps) {
  const t = useTranslations("campaignCreator");
  const locale = useLocale();

  const tierLabel =
    tier === "good"
      ? t("advancedTargetingEstimatedReachBadgeGood")
      : tier === "medium"
        ? t("advancedTargetingEstimatedReachBadgeMedium")
        : t("advancedTargetingEstimatedReachBadgeLow");

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("advancedTargetingEstimatedReachDetailsTitle")}
      subtitle={t("advancedTargetingEstimatedReachDetailsSubtitle")}
      titleIcon={<Users size={18} />}
      width="md"
      hideFooter
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("advancedTargetingEstimatedReachLabel")}
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-main)]">
            {t("advancedTargetingEstimatedReachRange", {
              lower: formatReach(usersLowerBound, locale),
              upper: formatReach(usersUpperBound, locale)
            })}
          </p>
          <span
            className={`campaign-creator-advanced-targeting-reach__badge campaign-creator-advanced-targeting-reach__badge--${tier} mt-2 inline-flex`}
          >
            {tierLabel}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-[var(--creator-card-border,var(--border-color))] px-2.5 py-2">
            <dt className="text-[var(--text-dimmer)]">{t("advancedTargetingEstimatedReachLower")}</dt>
            <dd className="mt-0.5 font-semibold text-[var(--text-main)]">
              {formatFull(usersLowerBound, locale)}
            </dd>
          </div>
          <div className="rounded-lg border border-[var(--creator-card-border,var(--border-color))] px-2.5 py-2">
            <dt className="text-[var(--text-dimmer)]">{t("advancedTargetingEstimatedReachUpper")}</dt>
            <dd className="mt-0.5 font-semibold text-[var(--text-main)]">
              {formatFull(usersUpperBound, locale)}
            </dd>
          </div>
        </dl>

        <p className="text-[11px] leading-relaxed text-[var(--text-dimmer)]">
          {t("advancedTargetingEstimatedReachDisclaimer")}
        </p>
      </div>
    </CreatorModalShell>
  );
}
