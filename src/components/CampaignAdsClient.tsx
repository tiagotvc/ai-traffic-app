"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { rememberCampaign } from "@/components/CampaignsListClient";
import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
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
  embedded = false
}: {
  metaCampaignId: string;
  clientSlug: string;
  embedded?: boolean;
}) {
  const t = useTranslations("adsPage");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const adsetFilter = searchParams.get("adset");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [preset, setPreset] = useState<string>("default");
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
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const pageSize = 20;

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
      list.sort((x, y) => {
        let aVal: any = null;
        let bVal: any = null;
        if (key === "name") {
          aVal = (x.name ?? x.id).toLowerCase();
          bVal = (y.name ?? y.id).toLowerCase();
        } else if (key === "adset") {
          aVal = (x.adsetName ?? x.adsetId).toLowerCase();
          bVal = (y.adsetName ?? y.adsetId).toLowerCase();
        } else if (key === "status") {
          const rank = (s?: string) => (s === "ACTIVE" ? 2 : s === "PAUSED" ? 1 : 0);
          aVal = rank(x.status);
          bVal = rank(y.status);
        } else if (key in METRIC_BY_KEY) {
          const mk = key as MetricKey;
          aVal = Number(x.metrics?.[mk] ?? 0);
          bVal = Number(y.metrics?.[mk] ?? 0);
        } else {
          aVal = String((x as any)[key] ?? "").toLowerCase();
          bVal = String((y as any)[key] ?? "").toLowerCase();
        }
        if (aVal < bVal) return dir === "asc" ? -1 : 1;
        if (aVal > bVal) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [ads, search, statusFilter, adsetFilter, sort]);

  const adsetFilterName = adsetFilter
    ? ads.find((a) => a.adsetId === adsetFilter)?.adsetName ?? adsetFilter
    : null;

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Métricas exibidas conforme o tipo (preset) da campanha.
  const presetMetrics = presetMetricsFor(preset);

  const adAction = (adId: string, action: "pause" | "activate") => {
    startTransition(async () => {
      await fetch(`/api/ads/${encodeURIComponent(adId)}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      reload();
    });
  };

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
      </div>

      {adsetFilter ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700">
            {t("adsetFilter", { name: adsetFilterName ?? "" })}
            <Link
              href={`/campaigns/${metaCampaignId}/ads?client=${encodeURIComponent(clientSlug)}`}
              className="text-violet-500 hover:text-violet-800"
              title={t("clearFilter")}
            >
              ✕
            </Link>
          </span>
        </div>
      ) : null}

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-2">
                    {t("colAd")}
                    {sort?.key === "name" ? <span className="text-xs">{sort.dir === "asc" ? "▲" : "▼"}</span> : null}
                  </button>
                </th>
                <th className="px-3 py-3">
                  <button type="button" onClick={() => toggleSort("adset")} className="flex items-center gap-2">
                    {t("colAdset")}
                    {sort?.key === "adset" ? <span className="text-xs">{sort.dir === "asc" ? "▲" : "▼"}</span> : null}
                  </button>
                </th>
                {presetMetrics.map((m) => (
                  <th key={m} className="px-3 py-3 text-right">
                    <button type="button" onClick={() => toggleSort(m)} className="ml-auto">
                      {tMetrics(METRIC_BY_KEY[m].label)} {sort?.key === m ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3">
                  <button type="button" onClick={() => toggleSort("status")} className="flex items-center gap-2">
                    {t("colStatus")}
                    {sort?.key === "status" ? <span className="text-xs">{sort.dir === "asc" ? "▲" : "▼"}</span> : null}
                  </button>
                </th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {adsLoading && ads.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                        <Skeleton className="h-3.5 w-40 max-w-full" />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-5 w-20 rounded-md" />
                    </td>
                    {presetMetrics.map((m) => (
                      <td key={m} className="px-3 py-3 text-right">
                        <Skeleton className="ml-auto h-3.5 w-12" />
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-4 w-3" />
                    </td>
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={4 + presetMetrics.length} className="px-4 py-8 text-center text-sm text-slate-500">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paged.map((ad) => {
                  const name = ad.name ?? ad.id;
                  return (
                    <tr key={ad.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setPreviewing(ad)}
                          className="group flex items-center gap-3 text-left"
                        >
                          {ad.creative?.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ad.creative.thumbnail_url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover transition group-hover:opacity-80"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                              {(name[0] ?? "A").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-900 group-hover:text-violet-700 group-hover:underline">
                              {name}
                            </div>
                            <div className="text-[10px] text-slate-400">{ad.id}</div>
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {ad.adsetName ?? ad.adsetId}
                        </span>
                      </td>
                      {presetMetrics.map((m) => (
                        <td
                          key={m}
                          className="px-3 py-3 text-right tabular-nums text-slate-700"
                        >
                          {ad.metrics
                            ? formatMetricValue(m, ad.metrics[m] ?? 0, locale)
                            : "—"}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={ad.status === "ACTIVE"}
                            disabled={isPending}
                            onChange={() =>
                              adAction(ad.id, ad.status === "ACTIVE" ? "pause" : "activate")
                            }
                            className="accent-violet-600"
                          />
                          <Badge variant={statusVariant(ad.status ?? "")}>
                            {statusLabel(ad.status ?? "", t)}
                          </Badge>
                        </label>
                      </td>
                      <td className="px-3 py-3 text-slate-400">⋮</td>
                    </tr>
                  );
                })
              )}
            </tbody>
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
          downloadHref={
            previewing.creative?.thumbnail_url
              ? `/api/creatives/download?u=${encodeURIComponent(previewing.creative.thumbnail_url)}&name=${encodeURIComponent(previewing.name ?? previewing.id)}`
              : null
          }
          onClose={() => setPreviewing(null)}
        />
      ) : null}
    </div>
  );
}
