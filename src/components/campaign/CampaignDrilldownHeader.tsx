"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import { PeriodFilter, type PeriodState } from "@/components/PeriodFilter";
import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { Badge } from "@/components/ui/Badge";
import { CampaignMetaInfoCard } from "@/components/campaign/CampaignMetaInfoCard";
import type { DrilldownCampaign } from "@/lib/campaign-drilldown-cache";

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <RefreshCw className={`animate-spin ${className}`} aria-hidden />;
}

function statusVariant(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PAUSED") return "accent" as const;
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
  titleBadges,
  tabActions,
  filtersContent
}: {
  campaign: DrilldownCampaign;
  locale: string;
  period: PeriodState;
  onPeriodChange: (next: PeriodState) => void;
  onRefresh?: () => void;
  syncing?: boolean;
  translationNs?: "campaignManager" | "adsetsPage" | "adsPage" | "creativesPage";
  /** Badges ao lado do status (ex.: contagem da aba). */
  titleBadges?: ReactNode;
  /** Botões de ação da aba (ex.: + Novo conjunto). */
  tabActions?: ReactNode;
  /** Filtros da aba — unificados com período no painel colapsável. */
  filtersContent?: ReactNode;
}) {
  const t = useTranslations(translationNs);
  const tDash = useTranslations("dashboard");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const headerActions = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      {tabActions}
      <FilterToggleButton
        open={filtersOpen}
        showLabel={tDash("showFilters")}
        hideLabel={tDash("hideFilters")}
        onClick={() => setFiltersOpen((v) => !v)}
      />
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={syncing}
          className="ui-btn-accent-outline ui-btn-responsive text-sm disabled:cursor-not-allowed disabled:opacity-60"
          title={syncing ? t("syncing") : t("refreshLive")}
          aria-label={syncing ? t("syncing") : t("refreshLive")}
        >
          {syncing ? <Spinner /> : <RefreshCw size={15} className="shrink-0" />}
          <span className="ui-btn-responsive-label">{syncing ? t("syncing") : t("refreshLive")}</span>
        </button>
      ) : null}
    </div>
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-[1.65rem]">
            {campaign.name}
          </h1>
          <Badge variant={statusVariant(campaign.status)}>{statusLabel(campaign.status, t)}</Badge>
          {titleBadges}
        </div>
        {headerActions}
      </div>

      <CampaignMetaInfoCard campaign={campaign} locale={locale} translationNs={translationNs} />

      {filtersOpen ? (
        <div
          className="ui-campaign-filters-bar rounded-xl border p-2.5"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
        >
          <PeriodFilter value={period} onChange={onPeriodChange} className="w-auto shrink-0" />
          {filtersContent}
        </div>
      ) : null}
    </section>
  );
}
