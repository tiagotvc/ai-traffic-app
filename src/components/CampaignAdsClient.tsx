"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { ListFilter } from "lucide-react";

import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { CampaignDrilldownHeader } from "@/components/campaign/CampaignDrilldownHeader";
import { CampaignTabCountBadge } from "@/components/campaign/CampaignTabCountBadge";
import { CampaignMetricTableFooter } from "@/components/campaign/CampaignMetricTableFooter";
import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import { CampaignTableCell } from "@/components/campaign/CampaignTableColumns";
import { CampaignTableColumnsButton } from "@/components/CampaignTableColumnsButton";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link, useRouter } from "@/i18n/navigation";
import { computeGroupTotals } from "@/lib/campaign-group-totals";
import {
  campaignAdsHref,
  campaignTabQuery,
  clearRememberedAdset,
  getRememberedAdset,
  rememberAdset
} from "@/lib/campaign-navigation";
import { columnRefKey } from "@/lib/campaign-table-layout";
import {
  STICKY_NAME_TD,
  STICKY_NAME_TH,
  STICKY_STATUS_TD,
  STICKY_STATUS_TH
} from "@/lib/campaign-table-sticky";
import { sortRowsByKey } from "@/lib/campaign-table-sort";
import {
  customTypesToMap,
  metricsColumnsForPreset
} from "@/lib/campaign-table-metrics";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { META_ACTION_CATALOG } from "@/lib/meta-metrics-catalog";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { CreativePreviewModal } from "@/components/creatives/CreativePreviewModal";
import { useCampaignDrilldown } from "@/hooks/useCampaignDrilldown";

type AdMetrics = Partial<Record<MetricKey, number>>;

type AdRow = {
  id: string;
  name?: string;
  status?: string;
  adsetId: string;
  adsetName?: string;
  creative?: {
    id: string;
    name?: string;
    thumbnail_url?: string;
  };
  metrics?: AdMetrics | null;
};

function statusLabel(status: string, t: (k: string) => string) {
  if (status === "ACTIVE") return t("statusActive");
  if (status === "PAUSED") return t("statusPaused");
  return status;
}

export function CampaignAdsClient({
  metaCampaignId,
  clientSlug,
  embedded = false,
  initialAdsetId
}: {
  metaCampaignId: string;
  clientSlug: string;
  embedded?: boolean;
  initialAdsetId?: string;
}) {
  const t = useTranslations("adsPage");
  const tCampaigns = useTranslations("campaignsPage");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openPanel } = usePublishPanel();
  const drilldown = useCampaignDrilldown();
  const {
    campaign,
    ads: drilldownAds,
    counts,
    countsLoading,
    period,
    setPeriod,
    refresh,
    loading: drilldownLoading,
    preset: drilldownPreset
  } = drilldown;
  const tableLayout = useCampaignTableLayout();
  const { types: customTypes } = useCampaignTypes();
  const [preset, setPreset] = useState<string>(drilldownPreset);
  useEffect(() => {
    setPreset(drilldownPreset);
  }, [drilldownPreset]);
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
  const urlAdset = searchParams.get("adset");
  const urlQueryString = searchParams.toString();
  const rememberedAdsetAppliedRef = useRef(false);
  const [adsetFilter, setAdsetFilter] = useState<string | null>(
    urlAdset ?? initialAdsetId ?? null
  );
  const ads = drilldownAds as AdRow[];
  const adsLoading = drilldownLoading;
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [previewing, setPreviewing] = useState<AdRow | null>(null);
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

  useEffect(() => {
    rememberedAdsetAppliedRef.current = false;
  }, [metaCampaignId]);

  useEffect(() => {
    if (urlAdset) {
      setAdsetFilter(urlAdset);
      rememberAdset(metaCampaignId, urlAdset);
      rememberedAdsetAppliedRef.current = true;
      return;
    }

    if (rememberedAdsetAppliedRef.current) return;

    const remembered = getRememberedAdset(metaCampaignId);
    if (remembered?.adsetId) {
      rememberedAdsetAppliedRef.current = true;
      setAdsetFilter(remembered.adsetId);
      const qs = campaignTabQuery(clientSlug, remembered.adsetId, urlQueryString);
      router.replace(`/campaigns/${metaCampaignId}/ads${qs}`, { scroll: false });
      return;
    }

    if (initialAdsetId) {
      setAdsetFilter(initialAdsetId);
      rememberAdset(metaCampaignId, initialAdsetId);
    }
  }, [urlAdset, urlQueryString, metaCampaignId, clientSlug, initialAdsetId, router]);

  const toggleSort = (key: string) => {
    setPage(1);
    setSort((s) => {
      if (s?.key === key) return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "desc" };
    });
  };

  const filtered = useMemo(() => {
    let list = ads.slice();
    if (adsetFilter) list = list.filter((a) => a.adsetId === adsetFilter);
    if (statusFilter === "active") list = list.filter((a) => a.status === "ACTIVE");
    if (statusFilter === "paused") list = list.filter((a) => a.status === "PAUSED");
    if (sort) {
      const { key, dir } = sort;
      if (key === "name" || key === "adset" || key === "status") {
        list = [...list].sort((x, y) => {
          let aVal: string | number = "";
          let bVal: string | number = "";
          if (key === "name") {
            aVal = (x.name ?? x.id).toLowerCase();
            bVal = (y.name ?? y.id).toLowerCase();
          } else if (key === "adset") {
            aVal = (x.adsetName ?? x.adsetId).toLowerCase();
            bVal = (y.adsetName ?? y.adsetId).toLowerCase();
          } else {
            const rank = (s?: string) => (s === "ACTIVE" ? 2 : s === "PAUSED" ? 1 : 0);
            aVal = rank(x.status);
            bVal = rank(y.status);
          }
          if (aVal < bVal) return dir === "asc" ? -1 : 1;
          if (aVal > bVal) return dir === "asc" ? 1 : -1;
          return 0;
        });
      } else {
        const rowForSort = (ad: AdRow) => ({
          ...ad,
          ...(ad.metrics ?? {}),
          campaignName: ad.name ?? ad.id,
          clientName: ad.adsetName ?? ad.adsetId
        });
        list = sortRowsByKey(
          list.map(rowForSort),
          key,
          dir,
          metricColumns,
          tableLayout.customMetricsMap
        );
      }
    }
    return list;
  }, [ads, statusFilter, adsetFilter, sort, metricColumns, tableLayout.customMetricsMap]);

  const adsetFilterName = adsetFilter
    ? ads.find((a) => a.adsetId === adsetFilter)?.adsetName ??
      getRememberedAdset(metaCampaignId)?.adsetName ??
      adsetFilter
    : null;

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const totals = useMemo(
    () =>
      computeGroupTotals(
        filtered.map((ad) => ({ ...(ad.metrics ?? {}) })),
        metricColumns,
        tableLayout.customMetricsMap
      ),
    [filtered, metricColumns, tableLayout.customMetricsMap]
  );

  const adAction = (adId: string, action: "pause" | "activate") => {
    setStatusPendingId(adId);
    startTransition(async () => {
      try {
        await fetch(`/api/ads/${encodeURIComponent(adId)}/actions`, {
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

  function openNewAd() {
    if (!adsetFilter) return;
    openPanel({
      clientSlug: slug,
      metaCampaignId,
      adsetId: adsetFilter,
      mode: "add-ad"
    });
  }

  if ((drilldownLoading || adsLoading) && !campaign) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <TableSkeleton
          rows={5}
          columns={["media", "badge", "metric", "metric", "metric", "badge"]}
        />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const slug = campaign.clientSlug || clientSlug;

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
        titleBadges={<CampaignTabCountBadge count={adsLoading ? "…" : ads.length} />}
        tabActions={
          <button
            type="button"
            onClick={openNewAd}
            disabled={!adsetFilter}
            title={!adsetFilter ? t("newAdSelectAdset") : undefined}
            className="ui-btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            + {t("newAd")}
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
        activeTab="ads"
        adsetsCount={countsLoading ? null : counts.adsets}
        adsCount={adsLoading ? null : ads.length}
        creativesCount={countsLoading ? null : counts.creatives}
        embedded={embedded}
        translationNs="adsPage"
        adsetId={adsetFilter}
      />

      {adsetFilter ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(124,58,237,0.06)] px-3 py-1 font-medium text-[var(--violet)]">
            {t("adsetFilter", { name: adsetFilterName ?? "" })}
            <Link
              href={campaignAdsHref(metaCampaignId, slug)}
              className="text-violet-500 hover:text-[var(--violet)]"
              title={t("clearFilter")}
              onClick={() => {
                clearRememberedAdset(metaCampaignId);
                setAdsetFilter(null);
              }}
            >
              ✕
            </Link>
          </span>
        </div>
      ) : null}

      <div className="ui-card overflow-hidden">
        <div className="ds-scroll overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-[var(--surface-thead)] text-xs font-semibold uppercase text-[var(--text-dim)]">
              <tr>
                <th className={`whitespace-nowrap ${STICKY_STATUS_TH}`}>
                  <button type="button" onClick={() => toggleSort("status")} className="hover:text-[var(--text-dim)]">
                    {t("colStatus")}
                    {sort?.key === "status" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                <th className={`whitespace-nowrap ${STICKY_NAME_TH}`}>
                  <button type="button" onClick={() => toggleSort("name")} className="hover:text-[var(--text-dim)]">
                    {t("colAd")}
                    {sort?.key === "name" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                {!adsetFilter ? (
                  <th className="whitespace-nowrap px-3 py-2 text-center">
                    <button type="button" onClick={() => toggleSort("adset")} className="hover:text-[var(--text-dim)]">
                      {t("colAdset")}
                      {sort?.key === "adset" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ) : null}
                {metricColumns.map((m) => {
                  const sortKey = columnRefKey(m);
                  return (
                    <th key={sortKey} className="whitespace-nowrap px-3 py-2 text-center">
                      <button type="button" onClick={() => toggleSort(sortKey)} className="hover:text-[var(--text-dim)]">
                        {metricColLabel(m)}
                        {sort?.key === sortKey ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {adsLoading && ads.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-[var(--border-color)] hover:bg-[var(--row-hover)]">
                    <td className={STICKY_STATUS_TD}>
                      <Skeleton className="mx-auto h-5 w-9 rounded-full" />
                    </td>
                    <td className={STICKY_NAME_TD}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                        <Skeleton className="h-3.5 w-40 max-w-full" />
                      </div>
                    </td>
                    {!adsetFilter ? (
                      <td className="px-3 py-3">
                        <Skeleton className="mx-auto h-5 w-20 rounded-md" />
                      </td>
                    ) : null}
                    {metricColumns.map((m) => (
                      <td key={columnRefKey(m)} className="px-3 py-3 text-center">
                        <Skeleton className="mx-auto h-3.5 w-12" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + metricColumns.length + (adsetFilter ? 0 : 1)}
                    className="px-4 py-8 text-center text-sm text-[var(--text-dim)]"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paged.map((ad) => {
                  const name = ad.name ?? ad.id;
                  return (
                    <tr key={ad.id} className="group border-t border-[var(--border-color)] hover:bg-[var(--row-hover)]">
                      <td className={STICKY_STATUS_TD}>
                        <CampaignStatusToggle
                          active={ad.status === "ACTIVE"}
                          disabled={statusPendingId === ad.id || isPending}
                          ariaLabel={statusLabel(ad.status ?? "", t)}
                          onChange={() =>
                            adAction(ad.id, ad.status === "ACTIVE" ? "pause" : "activate")
                          }
                        />
                      </td>
                      <td className={STICKY_NAME_TD}>
                        <button
                          type="button"
                          onClick={() => setPreviewing(ad)}
                          className="group/btn flex w-full items-center gap-3 text-left"
                        >
                          {ad.creative?.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ad.creative.thumbnail_url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover transition group-hover/btn:opacity-80"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-bg)] text-sm font-medium text-[var(--text-dim)]">
                              {(name[0] ?? "A").toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="whitespace-normal break-words font-medium text-[var(--text-main)] group-hover/btn:text-[var(--violet)] group-hover/btn:underline">
                              {name}
                            </div>
                            <div className="text-[10px] text-[var(--text-dimmer)]">{ad.id}</div>
                          </div>
                        </button>
                      </td>
                      {!adsetFilter ? (
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-block rounded-md bg-[var(--surface-bg)] px-2 py-0.5 text-xs font-medium text-[var(--text-dim)]">
                            {ad.adsetName ?? ad.adsetId}
                          </span>
                        </td>
                      ) : null}
                      {metricColumns.map((col) => (
                        <CampaignTableCell
                          key={columnRefKey(col)}
                          col={col}
                          row={{ ...(ad.metrics ?? {}) }}
                          customMetrics={tableLayout.customMetricsMap}
                        />
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && !adsLoading ? (
              <CampaignMetricTableFooter
                rowCount={filtered.length}
                totalLabel={tCampaigns("rowTotal")}
                metricColumns={metricColumns}
                totals={totals}
                customMetrics={tableLayout.customMetricsMap}
                middleCells={
                  !adsetFilter ? (
                    <td className="px-3 py-2.5 text-center text-[var(--text-dimmer)]">—</td>
                  ) : null
                }
              />
            ) : null}
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] px-4 py-3 text-xs text-[var(--text-dim)]">
          <span>
            {t("pagination", {
              from: filtered.length ? (page - 1) * pageSize + 1 : 0,
              to: Math.min(page * pageSize, filtered.length),
              total: filtered.length
            })}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-[var(--border-color)] px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="rounded ui-btn-primary px-2 py-1 text-xs">
              {page} / {totalPages}
            </span>
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

      {previewing ? (
        <CreativePreviewModal
          adId={previewing.id}
          imageUrl={previewing.creative?.thumbnail_url ?? null}
          name={previewing.name ?? previewing.id}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
    </div>
  );
}
