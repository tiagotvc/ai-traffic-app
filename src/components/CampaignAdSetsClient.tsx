"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { ListFilter } from "lucide-react";

import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { CampaignDrilldownHeader } from "@/components/campaign/CampaignDrilldownHeader";
import { CampaignDrilldownStatCard } from "@/components/campaign/CampaignDrilldownStatCard";
import { CampaignSpendDistributionCard } from "@/components/campaign/CampaignSpendDistributionCard";
import { CampaignTabCountBadge } from "@/components/campaign/CampaignTabCountBadge";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";
import { campaignAdsHref, rememberAdset } from "@/lib/campaign-navigation";
import { formatBRL, formatNumber, formatRoas } from "@/lib/format";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { CampaignTableCell } from "@/components/campaign/CampaignTableColumns";
import { CampaignMetricTableFooter } from "@/components/campaign/CampaignMetricTableFooter";
import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import { CampaignTableColumnsButton } from "@/components/CampaignTableColumnsButton";
import { useCampaignDrilldown } from "@/hooks/useCampaignDrilldown";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { columnRefKey, type MetricRowData } from "@/lib/campaign-table-layout";
import { computeGroupTotals } from "@/lib/campaign-group-totals";
import {
  STICKY_NAME_TD,
  STICKY_NAME_TH,
  STICKY_STATUS_TD,
  STICKY_STATUS_TH
} from "@/lib/campaign-table-sticky";
import {
  customTypesToMap,
  metricsColumnsForPreset
} from "@/lib/campaign-table-metrics";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { META_ACTION_CATALOG } from "@/lib/meta-metrics-catalog";


type AdSetRow = {
  id: string;
  name?: string;
  status?: string;
  dailyBudget: number | null;
  spend: number;
  conversions: number;
  cpa: number | null;
  roas: number;
  reach: number;
  clicks: number;
  ctr: number;
  metrics?: Partial<Record<MetricKey, number>>;
};

function statusLabel(status: string, t: (k: string) => string) {
  if (status === "ACTIVE") return t("statusActive");
  if (status === "PAUSED") return t("statusPaused");
  return status;
}

export function CampaignAdSetsClient({
  metaCampaignId,
  clientSlug,
  embedded = false
}: {
  metaCampaignId: string;
  clientSlug: string;
  embedded?: boolean;
}) {
  const t = useTranslations("adsetsPage");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const { openPanel } = usePublishPanel();
  const tCampaigns = useTranslations("campaignsPage");
  const drilldown = useCampaignDrilldown();
  const {
    campaign,
    adsets,
    counts,
    countsLoading,
    period,
    setPeriod,
    refresh,
    loading
  } = drilldown;
  const tableLayout = useCampaignTableLayout();
  const { types: customTypes } = useCampaignTypes();
  const [preset, setPreset] = useState<string>(drilldown.preset);
  useEffect(() => {
    setPreset(drilldown.preset);
  }, [drilldown.preset]);
  const customTypesMap = useMemo(() => customTypesToMap(customTypes), [customTypes]);
  const metricColumns = useMemo(
    () => metricsColumnsForPreset(preset, customTypesMap),
    [preset, customTypesMap]
  );
  const customMetricNames = Object.fromEntries(
    tableLayout.customMetrics.map((m) => [m.id, m.name])
  );

  function metricColLabel(col: (typeof metricColumns)[number]) {
    if (col.kind === "metric") return tMetrics(METRIC_BY_KEY[col.key].label);
    if (col.kind === "meta_action") {
      const known = META_ACTION_CATALOG.find((a) => a.actionType === col.actionType);
      return known?.label ?? col.actionType;
    }
    if (col.kind === "custom") return customMetricNames[col.id] ?? col.id;
    return "";
  }

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const pageSize = 20;

  const [syncing, setSyncing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await refresh({ live: true });
    } finally {
      setSyncing(false);
    }
  }, [syncing, refresh]);

  const toggleSort = (key: string) => {
    setPage(1);
    setSort((s) => {
      if (s?.key === key) return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "desc" };
    });
  };

  const filtered = useMemo(() => {
    let list = adsets;
    if (statusFilter === "active") list = list.filter((a) => a.status === "ACTIVE");
    if (statusFilter === "paused") list = list.filter((a) => a.status === "PAUSED");
    if (sort) {
      const { key, dir } = sort;
      list = [...list].sort((x, y) => {
        let aVal: string | number = 0;
        let bVal: string | number = 0;
        if (key === "name") {
          aVal = (x.name ?? x.id).toLowerCase();
          bVal = (y.name ?? y.id).toLowerCase();
        } else if (key === "status") {
          const rank = (s?: string) => (s === "ACTIVE" ? 2 : s === "PAUSED" ? 1 : 0);
          aVal = rank(x.status);
          bVal = rank(y.status);
        } else if (key === "dailyBudget") {
          aVal = x.dailyBudget ?? 0;
          bVal = y.dailyBudget ?? 0;
        } else if (key in METRIC_BY_KEY) {
          const mk = key as MetricKey;
          aVal = Number(x.metrics?.[mk] ?? (x as unknown as Record<string, number>)[mk] ?? 0);
          bVal = Number(y.metrics?.[mk] ?? (y as unknown as Record<string, number>)[mk] ?? 0);
        } else {
          aVal = String((x as Record<string, unknown>)[key] ?? "").toLowerCase();
          bVal = String((y as Record<string, unknown>)[key] ?? "").toLowerCase();
        }
        if (aVal < bVal) return dir === "asc" ? -1 : 1;
        if (aVal > bVal) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [adsets, statusFilter, sort]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const totals = useMemo(
    () =>
      computeGroupTotals(
        filtered.map((a) => {
          const metrics = (a.metrics ?? {}) as MetricRowData;
          return {
            spend: a.spend,
            conversions: a.conversions,
            cpa: a.cpa,
            roas: a.roas,
            reach: a.reach,
            clicks: a.clicks,
            ctr: a.ctr,
            ...metrics
          };
        }),
        metricColumns,
        tableLayout.customMetricsMap
      ),
    [filtered, metricColumns, tableLayout.customMetricsMap]
  );

  const spendShares = useMemo(() => {
    const total = filtered.reduce((s, a) => s + a.spend, 0) || 1;
    return filtered.map((a) => ({
      id: a.id,
      name: a.name ?? a.id,
      pct: (a.spend / total) * 100,
      spend: a.spend
    }));
  }, [filtered]);

  const insights = useMemo(() => {
    if (!filtered.length) return [];
    const best = [...filtered].sort((a, b) => b.roas - a.roas)[0];
    const topSpend = [...filtered].sort((a, b) => b.spend - a.spend)[0];
    const paused = filtered.filter((a) => a.status === "PAUSED").length;
    const list = [
      t("insightBestRoas", { name: best.name ?? best.id, roas: formatRoas(best.roas, locale) }),
      t("insightTopSpend", { name: topSpend.name ?? topSpend.id })
    ];
    if (paused > 0) list.push(t("insightPaused", { count: paused }));
    return list;
  }, [filtered, t, locale]);

  const adsetAction = (adsetId: string, action: "pause" | "activate") => {
    setStatusPendingId(adsetId);
    startTransition(async () => {
      try {
        await fetch(`/api/adsets/${encodeURIComponent(adsetId)}/actions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action })
        });
        await refresh({ live: true });
      } finally {
        setStatusPendingId(null);
      }
    });
  };

  if (loading || !campaign) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const slug = campaign.clientSlug || clientSlug;
  const totalSpend = filtered.reduce((s, a) => s + a.spend, 0);
  const totalConversions = filtered.reduce((s, a) => s + a.conversions, 0);
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : null;

  return (
    <div className="space-y-5">
      {!embedded ? (
        <p className="ui-breadcrumb">
          <Link href="/campaigns" className="ui-link">
            {t("navCampaigns")}
          </Link>
          {" › "}
          <span className="text-[var(--text-main)]">{campaign.name}</span>
        </p>
      ) : null}

      <CampaignDrilldownHeader
        campaign={campaign}
        locale={locale}
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={() => void handleRefresh()}
        syncing={syncing}
        translationNs="campaignManager"
        titleBadges={<CampaignTabCountBadge count={adsets.length} />}
        tabActions={
          <button
            type="button"
            onClick={() => openPanel({ clientSlug: slug, metaCampaignId, mode: "add-adset" })}
            className="ui-btn-primary text-sm"
          >
            + {t("newAdset")}
          </button>
        }
        filtersContent={
          <>
            <FilterSelectDropdown
              className="ui-filter-panel-field"
              icon={<ListFilter size={14} />}
              label={tCampaigns("filterStatus")}
              placeholder={tCampaigns("statusAll")}
              value={statusFilter === "all" ? "" : statusFilter}
              onChange={(v) => {
                setStatusFilter(v || "all");
                setPage(1);
              }}
              options={[
                { value: "active", label: t("filterStatusActive") },
                { value: "paused", label: t("filterStatusPaused") }
              ]}
            />
            <div className="ml-auto shrink-0">
              <CampaignTableColumnsButton />
            </div>
          </>
        }
      />

      <CampaignDetailTabs
        metaCampaignId={metaCampaignId}
        clientSlug={slug}
        activeTab="adsets"
        adsetsCount={adsets.length}
        adsCount={countsLoading ? null : counts.ads}
        creativesCount={countsLoading ? null : counts.creatives}
        embedded={embedded}
        translationNs="adsetsPage"
      />

      <div className="grid grid-cols-3 gap-3">
        <CampaignDrilldownStatCard label={t("totalSpend")} value={formatBRL(totalSpend, locale)} />
        <CampaignDrilldownStatCard label={t("totalConversions")} value={totalConversions} />
        <CampaignDrilldownStatCard
          label="CPA médio"
          value={avgCpa != null ? formatBRL(avgCpa, locale) : "—"}
        />
      </div>

      <div className="ui-campaign-table-shell">
        <div className="ui-campaign-table-shell__header">
          <div className="ui-campaign-table-shell__title">
            <span className="truncate">{t("title")}</span>
          </div>
        </div>
        <div className="ds-scroll overflow-x-auto">
          <table className="ui-campaign-table min-w-[680px]">
            <thead>
              <tr>
                <th className={`whitespace-nowrap ${STICKY_STATUS_TH}`}>
                  <button type="button" onClick={() => toggleSort("status")} className="hover:text-[var(--text-main)]">
                    {t("colStatus")}
                    {sort?.key === "status" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                <th className={`whitespace-nowrap ${STICKY_NAME_TH}`}>
                  <button type="button" onClick={() => toggleSort("name")} className="hover:text-[var(--text-main)]">
                    {t("colAdset")}
                    {sort?.key === "name" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                {metricColumns.map((m) => {
                  const sortKey = m.kind === "metric" ? m.key : columnRefKey(m);
                  return (
                    <th key={columnRefKey(m)} className="whitespace-nowrap px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSort(sortKey)}
                        className="hover:text-[var(--text-main)]"
                      >
                        {metricColLabel(m)}
                        {sort?.key === sortKey ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                      </button>
                    </th>
                  );
                })}
                <th className="whitespace-nowrap px-3 py-2 text-center">
                  <button type="button" onClick={() => toggleSort("dailyBudget")} className="hover:text-[var(--text-main)]">
                    {t("colBudget")}
                    {sort?.key === "dailyBudget" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a) => {
                const name = a.name ?? a.id;
                return (
                  <tr key={a.id} className="group">
                    <td className={STICKY_STATUS_TD}>
                      <CampaignStatusToggle
                        active={a.status === "ACTIVE"}
                        disabled={statusPendingId === a.id || isPending}
                        ariaLabel={statusLabel(a.status ?? "", t)}
                        onChange={() => adsetAction(a.id, a.status === "ACTIVE" ? "pause" : "activate")}
                      />
                    </td>
                    <td className={STICKY_NAME_TD}>
                      <Link
                        href={campaignAdsHref(metaCampaignId, slug, a.id)}
                        onClick={() => rememberAdset(metaCampaignId, a.id, name)}
                        className="ui-campaign-table-name block max-w-[280px] whitespace-normal break-words"
                      >
                        {name}
                      </Link>
                      <div className="mt-0.5 text-[10px] text-[var(--text-dimmer)]">{a.id}</div>
                    </td>
                    {metricColumns.map((col) => (
                      <CampaignTableCell
                        key={columnRefKey(col)}
                        col={col}
                        row={{
                          spend: a.spend,
                          conversions: a.conversions,
                          cpa: a.cpa,
                          roas: a.roas,
                          reach: a.reach,
                          clicks: a.clicks,
                          ctr: a.ctr,
                          ...(a.metrics ?? {})
                        }}
                        customMetrics={tableLayout.customMetricsMap}
                      />
                    ))}
                    <td className="px-3 py-2.5 text-center tabular-nums text-[var(--text-dim)]">
                      {a.dailyBudget != null ? formatBRL(a.dailyBudget, locale) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 ? (
              <CampaignMetricTableFooter
                rowCount={filtered.length}
                totalLabel={tCampaigns("rowTotal")}
                metricColumns={metricColumns}
                totals={totals}
                customMetrics={tableLayout.customMetricsMap}
                trailingCells={
                  <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-[var(--text-main)]">
                    {formatBRL(filtered.reduce((s, a) => s + (a.dailyBudget ?? 0), 0), locale)}
                  </td>
                }
              />
            ) : null}
          </table>
        </div>
        {!paged.length ? (
          <p className="p-8 text-center text-sm text-[var(--text-dim)]">{t("empty")}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] px-4 py-3 text-xs text-[var(--text-dim)]">
          <span>
            {t("pagination", {
              from: filtered.length ? (page - 1) * pageSize + 1 : 0,
              to: Math.min(page * pageSize, filtered.length),
              total: filtered.length
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-[var(--border-color)] px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="font-medium text-[var(--ui-accent)]">{page}</span>
            <span>/ {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-[var(--border-color)] px-2 py-1 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CampaignSpendDistributionCard
          title={t("spendDistTitle")}
          slices={spendShares}
          totalSpend={totalSpend}
          formatSpend={(value) => formatBRL(value, locale)}
          emptyLabel={t("spendDistEmpty")}
          totalLabel={t("spendDistTotal")}
        />

        <div className="ui-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("insightsTitle")}</h3>
            <Badge variant="accent">{insights.length}</Badge>
          </div>
          <ul className="space-y-2">
            {insights.map((text, i) => (
              <li key={i} className="ui-alert-info flex gap-2 p-2.5 text-xs">
                <span aria-hidden>{["📈", "🎯", "⏱"][i] ?? "💡"}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-3 text-xs font-medium text-[var(--ui-accent)]">
            {t("allInsights")}
          </button>
        </div>
      </div>
    </div>
  );
}
