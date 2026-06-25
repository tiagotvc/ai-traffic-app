"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { PeriodFilter, type PeriodState } from "@/components/PeriodFilter";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { formatBRL } from "@/lib/format";
import type { DrilldownCampaign } from "@/lib/campaign-drilldown-cache";

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M22 12a10 10 0 00-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function statusVariant(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PAUSED") return "warning" as const;
  return "neutral" as const;
}

function statusLabel(status: string, t: (k: string) => string) {
  if (status === "ACTIVE") return t("statusActive");
  if (status === "PAUSED") return t("statusPaused");
  return status;
}

export function CampaignDrilldownHeader({
  campaign,
  locale,
  period,
  onPeriodChange,
  onRefresh,
  syncing = false,
  translationNs = "campaignManager",
  trailingActions
}: {
  campaign: DrilldownCampaign;
  locale: string;
  period: PeriodState;
  onPeriodChange: (next: PeriodState) => void;
  onRefresh?: () => void;
  syncing?: boolean;
  translationNs?: "campaignManager" | "adsetsPage" | "adsPage" | "creativesPage";
  trailingActions?: ReactNode;
}) {
  const t = useTranslations(translationNs);

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold text-[var(--text-main)]">{campaign.name}</h1>
          <Badge variant={statusVariant(campaign.status)}>{statusLabel(campaign.status, t)}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-dim)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-4 w-4 rounded bg-blue-600 text-[8px] font-bold leading-4 text-white text-center">
              f
            </span>
            ID: {campaign.id}
          </span>
          <span>
            {t("client")}:{" "}
            <Link href={`/clients/${campaign.clientSlug}`} className="ui-link font-medium">
              {campaign.clientName}
            </Link>
          </span>
          <span>
            {t("account")}: {campaign.accountLabel}
          </span>
          <span>
            {t("objective")}: {campaign.objective}
          </span>
          <span>
            {t("dailyBudget")}:{" "}
            <strong className="text-[var(--text-main)]">
              {campaign.dailyBudget != null ? formatBRL(campaign.dailyBudget, locale) : "—"}
            </strong>
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PeriodFilter value={period} onChange={onPeriodChange} />
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={syncing}
            className="ui-btn-secondary ui-btn-responsive text-sm disabled:cursor-not-allowed disabled:opacity-60"
            title={syncing ? t("syncing") : t("refresh")}
            aria-label={t("refresh")}
          >
            {syncing ? <Spinner className="h-4 w-4" /> : <span aria-hidden>↻</span>}
            <span className="ui-btn-responsive-label">{syncing ? t("syncing") : t("refresh")}</span>
          </button>
        ) : null}
        {trailingActions}
      </div>
    </div>
  );
}
