"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { rememberCampaign } from "@/components/CampaignsListClient";
import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { Badge } from "@/components/ui/Badge";
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

type AdMetrics = Partial<Record<MetricKey, number>>;

type Campaign = {
  id: string;
  name: string;
  status: string;
  dailyBudget: number | null;
  clientSlug: string;
  clientName: string;
  accountLabel: string;
  metaAdAccountId: string;
  objective: string;
};

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
  const tableLayout = useCampaignTableLayout();
  const { types: customTypes } = useCampaignTypes();
  const [preset, setPreset] = useState<string>("default");
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
  const [adsetFilter, setAdsetFilter] = useState<string | null>(
    urlAdset ?? initialAdsetId ?? null
  );
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [adsetsCount, setAdsetsCount] = useState<number | null>(null);
  const [creativesCount, setCreativesCount] = useState<number | null>(null);
  const [adsLoading, setAdsLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [previewing, setPreviewing] = useState<AdRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const pageSize = 20;

  useEffect(() => {
    const fromUrl = searchParams.get("adset");
    if (fromUrl) {
      setAdsetFilter(fromUrl);
      rememberAdset(metaCampaignId, fromUrl);
      return;
    }

    const remembered = getRememberedAdset(metaCampaignId);
    if (remembered?.adsetId) {
      setAdsetFilter(remembered.adsetId);
      const slug = clientSlug || campaign?.clientSlug || "";
      const qs = campaignTabQuery(slug, remembered.adsetId);
      router.replace(`/campaigns/${metaCampaignId}/ads${qs}`, { scroll: false });
      return;
    }

    if (initialAdsetId) {
      setAdsetFilter(initialAdsetId);
      rememberAdset(metaCampaignId, initialAdsetId);
    }
  }, [searchParams, metaCampaignId, clientSlug, initialAdsetId, router, campaign?.clientSlug]);

  const toggleSort = (key: string) => {
    setPage(1);
    setSort((s) => {
      if (s?.key === key) return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "desc" };
    });
  };

  const reload = useCallback(() => {
    setAdsLoading(true);
    setCountsLoading(true);

    fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.campaign) {
          setCampaign(j.campaign);
          rememberCampaign(metaCampaignId, j.campaign.clientSlug || clientSlug);
        }
      });

    fetch("/api/campaign-presets")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPreset(j.presets?.[metaCampaignId] ?? "default");
      })
      .catch(() => {});

    fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/ads`)
      .then((r) => r.json())
      .then((j) => setAds(j.ads ?? []))
      .catch(() => setAds([]))
      .finally(() => setAdsLoading(false));

    const adsetsPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/adsets`)
      .then((r) => r.json())
      .then((j) => setAdsetsCount((j.adsets ?? []).length))
      .catch(() => setAdsetsCount(0));
    const creativesPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/creatives`)
      .then((r) => r.json())
      .then((j) => setCreativesCount(j.total ?? (j.rows ?? []).length))
      .catch(() => setCreativesCount(0));
    void Promise.all([adsetsPromise, creativesPromise]).finally(() => setCountsLoading(false));
  }, [metaCampaignId, clientSlug]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    let list = ads.slice();
    if (adsetFilter) list = list.filter((a) => a.adsetId === adsetFilter);
    if (statusFilter === "active") list = list.filter((a) => a.status === "ACTIVE");
    if (statusFilter === "paused") list = list.filter((a) => a.status === "PAUSED");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.name ?? a.id).toLowerCase().includes(q) ||
          (a.adsetName ?? a.adsetId).toLowerCase().includes(q)
      );
    }
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
  }, [ads, search, statusFilter, adsetFilter, sort, metricColumns, tableLayout.customMetricsMap]);

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
        reload();
      } finally {
        setStatusPendingId(null);
      }
    });
  };

  function openNewAd() {
    if (!adsetFilter || !campaign) return;
    openPanel({
      clientSlug: campaign.clientSlug || clientSlug,
      metaCampaignId,
      adsetId: adsetFilter,
      mode: "add-ad"
    });
  }

  if (!campaign) {
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

  const slug = campaign.clientSlug || clientSlug;

  return (
    <div className="space-y-4">
      {!embedded ? (
        <p className="text-xs text-slate-500">
          <Link href="/campaigns" className="hover:text-violet-600">
            {t("navCampaigns")}
          </Link>
          {" › "}
          <Link
            href={`/campaigns/${metaCampaignId}?client=${encodeURIComponent(slug)}`}
            className="hover:text-violet-600"
          >
            {campaign.name}
          </Link>
          {" › "}
          <span className="text-slate-700">{t("title")}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
              {adsLoading ? "…" : ads.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reload} className="ui-btn-secondary px-3 text-sm">
            ↻
          </button>
          <button
            type="button"
            onClick={openNewAd}
            disabled={!adsetFilter}
            title={!adsetFilter ? t("newAdSelectAdset") : undefined}
            className="ui-btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            + {t("newAd")}
          </button>
        </div>
      </div>

      <div className="ui-card flex flex-wrap items-center gap-3 p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
          f
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{campaign.name}</span>
            <Badge variant={statusVariant(campaign.status)}>{statusLabel(campaign.status, t)}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
            <span>ID: {campaign.id}</span>
            <span>
              {t("client")}: {campaign.clientName}
            </span>
            <span>
              {t("account")}: {campaign.accountLabel}
            </span>
            <span>
              {t("objective")}: {campaign.objective}
            </span>
          </div>
        </div>
      </div>

      <CampaignDetailTabs
        metaCampaignId={metaCampaignId}
        clientSlug={slug}
        activeTab="ads"
        adsetsCount={countsLoading ? null : adsetsCount}
        adsCount={adsLoading ? null : ads.length}
        creativesCount={countsLoading ? null : creativesCount}
        embedded={embedded}
        translationNs="adsPage"
        adsetId={adsetFilter}
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("search")}
          className="ui-input min-w-[200px] flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ui-select w-auto text-sm"
        >
          <option value="all">{t("filterStatusAll")}</option>
          <option value="active">{t("filterStatusActive")}</option>
          <option value="paused">{t("filterStatusPaused")}</option>
        </select>
        <div className="ml-auto">
          <CampaignTableColumnsButton />
        </div>
      </div>

      {adsetFilter ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700">
            {t("adsetFilter", { name: adsetFilterName ?? "" })}
            <Link
              href={campaignAdsHref(metaCampaignId, slug)}
              className="text-violet-500 hover:text-violet-800"
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className={`whitespace-nowrap ${STICKY_STATUS_TH}`}>
                  <button type="button" onClick={() => toggleSort("status")} className="hover:text-slate-700">
                    {t("colStatus")}
                    {sort?.key === "status" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                <th className={`whitespace-nowrap ${STICKY_NAME_TH}`}>
                  <button type="button" onClick={() => toggleSort("name")} className="hover:text-slate-700">
                    {t("colAd")}
                    {sort?.key === "name" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                {!adsetFilter ? (
                  <th className="whitespace-nowrap px-3 py-2 text-center">
                    <button type="button" onClick={() => toggleSort("adset")} className="hover:text-slate-700">
                      {t("colAdset")}
                      {sort?.key === "adset" ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ) : null}
                {metricColumns.map((m) => {
                  const sortKey = m.kind === "metric" ? m.key : columnRefKey(m);
                  return (
                    <th key={columnRefKey(m)} className="whitespace-nowrap px-3 py-2 text-center">
                      <button type="button" onClick={() => toggleSort(sortKey)} className="hover:text-slate-700">
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
                  <tr key={i} className="border-t border-slate-100">
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
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paged.map((ad) => {
                  const name = ad.name ?? ad.id;
                  return (
                    <tr key={ad.id} className="group border-t border-slate-100 hover:bg-violet-50/40">
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
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-500">
                              {(name[0] ?? "A").toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="whitespace-normal break-words font-medium text-slate-800 group-hover/btn:text-violet-700 group-hover/btn:underline">
                              {name}
                            </div>
                            <div className="text-[10px] text-slate-400">{ad.id}</div>
                          </div>
                        </button>
                      </td>
                      {!adsetFilter ? (
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
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
                    <td className="px-3 py-2.5 text-center text-slate-400">—</td>
                  ) : null
                }
              />
            ) : null}
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
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
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="rounded bg-violet-600 px-2 py-1 text-white">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
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
