"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { rememberCampaign } from "@/components/CampaignsListClient";
import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";
import { formatBRL, formatNumber, formatRoas } from "@/lib/format";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";

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
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [adsets, setAdsets] = useState<AdSetRow[]>([]);
  const [preset, setPreset] = useState<string>("default");
  const [adsCount, setAdsCount] = useState<number | null>(null);
  const [creativesCount, setCreativesCount] = useState<number | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const pageSize = 20;

  const reload = useCallback(() => {
    fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.campaign) {
          setCampaign(j.campaign);
          rememberCampaign(metaCampaignId, j.campaign.clientSlug || clientSlug);
        }
      });
    fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/adsets`)
      .then((r) => r.json())
      .then((j) => {
        setAdsets(j.adsets ?? []);
        if (j.preset) setPreset(j.preset);
      })
      .catch(() => setAdsets([]));
    fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/timeseries`)
      .then((r) => r.json())
      .then((j) => setSeries(j.series ?? []));
    setCountsLoading(true);
    const adsPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/ads`)
      .then((r) => r.json())
      .then((j) => setAdsCount(j.total ?? (j.ads ?? []).length))
      .catch(() => setAdsCount(0));
    const creativesPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/creatives`)
      .then((r) => r.json())
      .then((j) => setCreativesCount(j.total ?? (j.rows ?? []).length))
      .catch(() => setCreativesCount(0));
    void Promise.all([adsPromise, creativesPromise]).finally(() => setCountsLoading(false));
  }, [metaCampaignId, clientSlug]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    let list = adsets;
    if (statusFilter === "active") list = list.filter((a) => a.status === "ACTIVE");
    if (statusFilter === "paused") list = list.filter((a) => a.status === "PAUSED");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => (a.name ?? a.id).toLowerCase().includes(q));
    }
    return list;
  }, [adsets, search, statusFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const totals = useMemo(
    () => ({
      spend: filtered.reduce((s, a) => s + a.spend, 0),
      conversions: filtered.reduce((s, a) => s + a.conversions, 0),
      cpa:
        filtered.reduce((s, a) => s + a.conversions, 0) > 0
          ? filtered.reduce((s, a) => s + a.spend, 0) / filtered.reduce((s, a) => s + a.conversions, 0)
          : null
    }),
    [filtered]
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
    startTransition(async () => {
      await fetch(`/api/adsets/${encodeURIComponent(adsetId)}/actions`, {
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
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const slug = campaign.clientSlug || clientSlug;
  const colors = ["#7c3aed", "#2563eb", "#059669", "#ea580c", "#db2777"];

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
              {adsets.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            {t("dateRange")}
          </div>
          <button type="button" className="ui-btn-secondary text-xs">
            {t("comparePeriod")}
          </button>
          <button type="button" onClick={reload} className="ui-btn-secondary px-3 text-sm">
            ↻
          </button>
          <button type="button" onClick={() => openPanel({ clientSlug: slug })} className="ui-btn-primary text-sm">
            + {t("newAdset")}
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
            <span>
              {t("campaignBudget")}:{" "}
              {campaign.dailyBudget != null ? formatBRL(campaign.dailyBudget, locale) : "—"}/dia
            </span>
          </div>
        </div>
      </div>

      <CampaignDetailTabs
        metaCampaignId={metaCampaignId}
        clientSlug={slug}
        activeTab="adsets"
        adsetsCount={adsets.length}
        adsCount={countsLoading ? null : adsCount}
        creativesCount={countsLoading ? null : creativesCount}
        embedded={embedded}
        translationNs="adsetsPage"
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
        <select className="ui-select w-auto text-sm">
          <option>{t("filterMetrics")}</option>
        </select>
        <button type="button" className="ui-btn-secondary text-xs">
          {t("moreFilters")}
        </button>
        <div className="ml-auto flex gap-2">
          <button type="button" className="ui-btn-secondary text-xs">
            {t("customizeCols")}
          </button>
          <button type="button" className="ui-btn-secondary text-xs">
            {t("export")}
          </button>
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("colAdset")}</th>
                <th className="px-3 py-3">{t("colStatus")}</th>
                {presetMetricsFor(preset).map((m) => (
                  <th key={m} className="px-3 py-3 text-right">
                    {tMetrics(METRIC_BY_KEY[m].label)}
                  </th>
                ))}
                <th className="px-3 py-3">{t("colBudget")}</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {paged.map((a, idx) => {
                const name = a.name ?? a.id;
                return (
                  <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: colors[idx % colors.length] }}
                        >
                          {(name[0] ?? "C").toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/campaigns/${metaCampaignId}/ads?client=${encodeURIComponent(slug)}&adset=${encodeURIComponent(a.id)}`}
                            className="font-medium text-slate-900 hover:text-violet-700 hover:underline"
                          >
                            {name}
                          </Link>
                          <div className="text-[10px] text-slate-400">{a.id}</div>
                          <span className="mt-1 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {inferTag(name, t)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={a.status === "ACTIVE"}
                          disabled={isPending}
                          onChange={() =>
                            adsetAction(a.id, a.status === "ACTIVE" ? "pause" : "activate")
                          }
                          className="accent-violet-600"
                        />
                        <span className="text-xs">
                          <Badge variant={statusVariant(a.status ?? "")}>
                            {statusLabel(a.status ?? "", t)}
                          </Badge>
                        </span>
                      </label>
                    </td>
                    {presetMetricsFor(preset).map((m) => (
                      <td key={m} className="px-3 py-3 text-right tabular-nums text-slate-700">
                        {formatMetricValue(m, Number(a.metrics?.[m] ?? 0), locale)}
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {a.dailyBudget != null ? formatBRL(a.dailyBudget, locale) : "—"}
                        <span className="text-slate-400">✎</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-400">⋮</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!paged.length ? (
          <p className="p-8 text-center text-sm text-slate-500">{t("empty")}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
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
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="font-medium text-violet-600">{page}</span>
            <span>/ {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
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
          <h3 className="text-sm font-semibold text-slate-900">{t("perfTitle")}</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="text-slate-500">{t("totalSpend")}</div>
              <div className="font-bold text-slate-900">{formatBRL(totals.spend, locale)}</div>
            </div>
            <div>
              <div className="text-slate-500">{t("totalConversions")}</div>
              <div className="font-bold">{totals.conversions}</div>
            </div>
            <div>
              <div className="text-slate-500">CPA médio</div>
              <div className="font-bold">
                {totals.cpa != null ? formatBRL(totals.cpa, locale) : "—"}
              </div>
            </div>
          </div>
          <div className="mt-4 flex h-32 items-end gap-1">
            {series.map((p) => {
              const max = Math.max(...series.map((s) => s.spend), 1);
              return (
                <div key={p.day} className="flex flex-1 flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t bg-violet-500"
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
                  <span className="truncate text-slate-600">{s.name}</span>
                  <span className="ml-auto font-medium">{s.pct.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/reports" className="mt-3 inline-block text-xs font-medium text-violet-600">
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
                className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-700"
              >
                <span>{["📈", "🎯", "⏱"][i] ?? "💡"}</span>
                {text}
              </li>
            ))}
          </ul>
          <button type="button" className="mt-3 text-xs font-medium text-violet-600">
            {t("allInsights")}
          </button>
        </div>
      </div>
    </div>
  );
}
