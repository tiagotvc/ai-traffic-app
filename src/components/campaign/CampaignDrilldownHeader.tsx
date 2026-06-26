"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import { PeriodFilter, type PeriodState } from "@/components/PeriodFilter";
import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { formatBRL } from "@/lib/format";
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

function MetaSep() {
  return <span className="mx-1.5 text-[var(--text-dimmer)]" aria-hidden>·</span>;
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
  const hasFilters = Boolean(filtersContent);

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

  const shortId =
    campaign.id.length > 12 ? `…${campaign.id.slice(-8)}` : campaign.id;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-[1.65rem]">
              {campaign.name}
            </h1>
            <Badge variant={statusVariant(campaign.status)}>{statusLabel(campaign.status, t)}</Badge>
            {titleBadges}
          </div>
          <p className="ui-campaign-meta-inline mt-1.5 truncate text-xs text-[var(--text-dim)]">
            <Link href={`/clients/${campaign.clientSlug}`} className="ui-link font-medium">
              {campaign.clientName}
            </Link>
            <MetaSep />
            <span title={`ID ${campaign.id}`} className="font-mono text-[10px] text-[var(--text-dimmer)]">
              {shortId}
            </span>
            <MetaSep />
            <span title={campaign.accountLabel} className="truncate">
              {campaign.accountLabel}
            </span>
            <MetaSep />
            <span className="text-[var(--text-dimmer)]">{campaign.objective}</span>
            <MetaSep />
            <span className="font-semibold text-[var(--text-main)]">
              {campaign.dailyBudget != null ? formatBRL(campaign.dailyBudget, locale) : "—"}
            </span>
          </p>
        </div>
        {headerActions}
      </div>

      {filtersOpen ? (
        <div
          className="ui-campaign-filters-panel space-y-3 rounded-xl border p-3"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter value={period} onChange={onPeriodChange} className="w-auto" />
          </div>
          {hasFilters ? (
            <div className="ui-filter-panel-grid border-t border-[var(--border-color)] pt-3 [&_button]:py-1.5 [&_button]:text-xs">
              {filtersContent}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
