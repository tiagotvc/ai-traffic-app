"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { ListFilter } from "lucide-react";

import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { CampaignDrilldownHeader } from "@/components/campaign/CampaignDrilldownHeader";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { DsPageHeader } from "@/design-system";
import { Link } from "@/i18n/navigation";
import { campaignAdsHref, rememberAdset } from "@/lib/campaign-navigation";
import { formatBRL, formatNumber, formatRoas } from "@/lib/format";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { CampaignTableCell } from "@/components/campaign/CampaignTableColumns";
import { CampaignMetricTableFooter } from "@/components/campaign/CampaignMetricTableFooter";
import { MetaFilterSearchBar } from "@/components/campaign/MetaFilterSearchBar";
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
import {
  type AppliedCampaignFilter,
  matchesCampaignFilters
} from "@/lib/campaign-meta-filters";


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

type SeriesPoint = { day: string; spend: number; conversions: number };

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

function inferTag(name: string, t: (k: string) => string) {
  const n = name.toLowerCase();
  if (n.includes("lookalike") || n.includes("la ")) return t("tagLookalike");
  if (n.includes("remarketing") || n.includes("retarget")) return t("tagRemarketing");
  if (n.includes("interesse")) return t("tagInterest");
  return t("tagSaved");
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
    series,
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

  const [search, setSearch] = useState("");
  const [metaFilters, setMetaFilters] = useState<AppliedCampaignFilter[]>([]);
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
    if (metaFilters.length) {
      list = list.filter((a) =>
        matchesCampaignFilters(
          {
            metaCampaignId: a.id,
            campaignName: a.name ?? a.id,
            status: a.status,
            dailyBudget: a.dailyBudget
          },
          metaFilters
        )
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => (a.name ?? a.id).toLowerCase().includes(q));
    }
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
  }, [adsets, search, statusFilter, sort, metaFilters]);

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
  const colors = ["#7c3aed", "#2563eb", "#059669", "#ea580c", "#db2777"];

  return (
    <div className="space-y-4">
      {!embedded ? (
        <DsPageHeader
          breadcrumbs={
            <>
              <Link href="/campaigns" className="ui-link">
                {t("navCampaigns")}
              </Link>
              {" › "}
              <Link
                href={`/campaigns/${metaCampaignId}?client=${encodeURIComponent(slug)}`}
                className="ui-link"
              >
                {campaign.name}
              </Link>
              {" › "}
              <span>{t("title")}</span>
            </>
          }
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <>
              <span className="rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-xs font-bold text-[var(--violet)]">
                {adsets.length}
              </span>
              <button type="button" onClick={() => openPanel({ clientSlug: slug })} className="ui-btn-primary text-sm">
                + {t("newAdset")}
              </button>
            </>
          }
        />
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-[var(--text-main)]">{t("title")}</h1>
              <span className="rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-xs font-bold text-[var(--violet)]">
                {adsets.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openPanel({ clientSlug: slug, metaCampaignId, mode: "add-adset" })}
              className="ui-btn-primary text-sm"
            >
              + {t("newAdset")}
            </button>
          </div>
        </div>
      )}

      <CampaignDrilldownHeader
        campaign={campaign}
        locale={locale}
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={() => void handleRefresh()}
        syncing={syncing}
        translationNs="campaignManager"
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

      <div className="flex flex-wrap items-center gap-2">
        <MetaFilterSearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filters={metaFilters}
          onFiltersChange={(next) => {
            setMetaFilters(next);
            setPage(1);
          }}
          className="min-w-[240px] flex-1"
        />
        <FilterSelectDropdown
          icon={<ListFilter size={14} />}
          label={tCampaigns("filterStatus")}
          placeholder={t("filterStatusAll")}
          value={statusFilter === "all" ? "" : statusFilter}
          onChange={(v) => setStatusFilter(v || "all")}
          options={[
            { value: "active", label: t("filterStatusActive") },
            { value: "paused", label: t("filterStatusPaused") }
          ]}
        />
        <select className="ui-select w-auto text-sm">
          <option>{t("filterMetrics")}</option>
        </select>
        <button type="button" className="ui-btn-secondary text-xs">
          {t("moreFilters")}
        </button>
        <div className="ml-auto flex gap-2">
          <CampaignTableColumnsButton />
          <button type="button" className="ui-btn-secondary text-xs">
            {t("export")}
          </button>
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-[var(--surface-thead)] text-xs font-semibold uppercase text-[var(--text-dim)]">
              <tr>
                <th className={`whitespace-nowrap ${STICKY_STATUS_TH}`}>
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className="hover:text-[var(--text-dim)]"
                  >
                    {t("colStatus")}
                    {sort?.key === "status" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                <th className={`whitespace-nowrap ${STICKY_NAME_TH}`}>
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="hover:text-[var(--text-dim)]"
                  >
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
                        className="hover:text-[var(--text-dim)]"
                      >
                        {metricColLabel(m)}
                        {sort?.key === sortKey ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                      </button>
                    </th>
                  );
                })}
                <th className="whitespace-nowrap px-3 py-2 text-center">
                  <button type="button" onClick={() => toggleSort("dailyBudget")} className="hover:text-[var(--text-dim)]">
                    {t("colBudget")}
                    {sort?.key === "dailyBudget" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a, idx) => {
                const name = a.name ?? a.id;
                return (
                  <tr key={a.id} className="group border-t border-[var(--border-color)] hover:bg-[var(--row-hover)]">
                    <td className={STICKY_STATUS_TD}>
                      <CampaignStatusToggle
                        active={a.status === "ACTIVE"}
                        disabled={statusPendingId === a.id || isPending}
                        ariaLabel={statusLabel(a.status ?? "", t)}
                        onChange={() => adsetAction(a.id, a.status === "ACTIVE" ? "pause" : "activate")}
                      />
                    </td>
                    <td className={STICKY_NAME_TD}>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                          style={{ backgroundColor: colors[idx % colors.length] }}
                        >
                          {(name[0] ?? "C").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={campaignAdsHref(metaCampaignId, slug, a.id)}
                            onClick={() => rememberAdset(metaCampaignId, a.id, name)}
                            className="block whitespace-normal break-words font-medium text-[var(--text-main)] hover:text-[var(--violet-bright)] hover:underline"
                          >
                            {name}
                          </Link>
                          <div className="text-[10px] text-[var(--text-dimmer)]">{a.id}</div>
                          <span className="mt-1 inline-block rounded-md bg-[var(--surface-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-dim)]">
                            {inferTag(name, t)}
                          </span>
                        </div>
                      </div>
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
                    {formatBRL(
                      filtered.reduce((s, a) => s + (a.dailyBudget ?? 0), 0),
                      locale
                    )}
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
            <span className="font-medium text-[var(--violet)]">{page}</span>
            <span>/ {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-[var(--border-color)] px-2 py-1 disabled:opacity-40"
            >
              ›
            </button>
            <select className="ui-select ml-2 w-auto py-1 text-xs">
              <option>20</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="ui-card p-4 xl:col-span-1">
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("perfTitle")}</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="text-[var(--text-dim)]">{t("totalSpend")}</div>
              <div className="font-bold text-[var(--text-main)]">
                {formatBRL(
                  filtered.reduce((s, a) => s + a.spend, 0),
                  locale
                )}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)]">{t("totalConversions")}</div>
              <div className="font-bold">
                {filtered.reduce((s, a) => s + a.conversions, 0)}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)]">CPA médio</div>
              <div className="font-bold">
                {(() => {
                  const conv = filtered.reduce((s, a) => s + a.conversions, 0);
                  const spend = filtered.reduce((s, a) => s + a.spend, 0);
                  return conv > 0 ? formatBRL(spend / conv, locale) : "—";
                })()}
              </div>
            </div>
          </div>
          <div className="mt-4 flex h-32 items-end gap-1">
            {series.map((p) => {
              const max = Math.max(...series.map((s) => s.spend), 1);
              return (
                <div key={p.day} className="flex flex-1 flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t bg-[rgba(124,58,237,0.06)]0"
                    style={{ height: `${Math.max(8, (p.spend / max) * 100)}%` }}
                  />
                  <div
                    className="w-full rounded-t bg-emerald-400"
                    style={{
                      height: `${Math.max(4, (p.conversions / Math.max(...series.map((s) => s.conversions), 1)) * 60)}%`
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="ui-card p-4">
          <h3 className="text-sm font-semibold">{t("spendDistTitle")}</h3>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="relative h-28 w-28 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(${spendShares
                  .map((s, i) => {
                    const start = spendShares
                      .slice(0, i)
                      .reduce((sum, x) => sum + x.pct, 0);
                    return `${colors[i % colors.length]} ${start}% ${start + s.pct}%`;
                  })
                  .join(", ")})`
              }}
            />
            <ul className="min-w-0 flex-1 space-y-1 text-[11px]">
              {spendShares.slice(0, 4).map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  />
                  <span className="truncate text-[var(--text-dim)]">{s.name}</span>
                  <span className="ml-auto font-medium">{s.pct.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/reports" className="mt-3 inline-block text-xs font-medium text-[var(--violet)]">
            {t("fullReport")}
          </Link>
        </div>

        <div className="ui-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("insightsTitle")}</h3>
            <Badge variant="brand">{insights.length} insights</Badge>
          </div>
          <ul className="mt-3 space-y-2">
            {insights.map((text, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] p-2 text-xs text-[var(--text-dim)]"
              >
                <span>{["📈", "🎯", "⏱"][i] ?? "💡"}</span>
                {text}
              </li>
            ))}
          </ul>
          <button type="button" className="mt-3 text-xs font-medium text-[var(--violet)]">
            {t("allInsights")}
          </button>
        </div>
      </div>
    </div>
  );
}
