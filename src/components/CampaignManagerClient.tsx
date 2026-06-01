"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { rememberCampaign } from "@/components/CampaignsListClient";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";
import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";

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
  kpis: {
    spend: number;
    conversions: number;
    cpa: number | null;
    roas: number;
    ctr: number;
    impressions: number;
    clicks: number;
  };
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
};

type SeriesPoint = { day: string; spend: number; conversions: number; cpa: number | null; roas: number };
type PrevPeriod = { spend: number; conversions: number; cpa: number | null; roas: number };
type DetailTab = "overview" | "adsets" | "ads" | "creatives" | "events";

const CHART_HEIGHT = 140;

export type CampaignSeedRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  accountLabel: string;
  metaAdAccountId?: string;
  status?: string;
  objective?: string | null;
  spend: number;
  conversions: number;
  leads?: number;
  roas: number;
  cpa: number | null;
};

function buildDetailQuery(periodQuery: string, seed?: CampaignSeedRow) {
  const raw = periodQuery.startsWith("?") ? periodQuery.slice(1) : periodQuery;
  const params = new URLSearchParams(raw);
  if (seed?.metaAdAccountId) params.set("metaAdAccountId", seed.metaAdAccountId);
  if (seed?.clientSlug) params.set("clientSlug", seed.clientSlug);
  if (seed?.campaignName) params.set("campaignName", seed.campaignName);
  if (seed?.status) params.set("status", seed.status);
  if (seed?.objective) params.set("objective", seed.objective);
  if (seed?.spend != null) params.set("spend", String(seed.spend));
  if (seed?.conversions != null) params.set("conversions", String(seed.conversions));
  if (seed?.leads != null) params.set("leads", String(seed.leads));
  if (seed?.roas != null) params.set("roas", String(seed.roas));
  if (seed?.cpa != null) params.set("cpa", String(seed.cpa));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function campaignFromSeed(seed: CampaignSeedRow, metaCampaignId: string): Campaign {
  return {
    id: metaCampaignId,
    name: seed.campaignName,
    status: seed.status ?? "ACTIVE",
    dailyBudget: null,
    clientSlug: seed.clientSlug,
    clientName: seed.clientName,
    accountLabel: seed.accountLabel,
    metaAdAccountId: seed.metaAdAccountId ?? "",
    objective: seed.objective ?? "leads",
    kpis: {
      spend: seed.spend,
      conversions: seed.conversions,
      cpa: seed.cpa,
      roas: seed.roas,
      ctr: 0,
      impressions: 0,
      clicks: 0
    }
  };
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

function pctDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="mt-2 opacity-80">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
}

function CampaignDetailSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      {!compact ? (
        <>
          <Skeleton className="h-8 w-2/3 max-w-md" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        </>
      ) : null}
      <div className="flex gap-1 border-b border-slate-200 pb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Skeleton key={n} className="h-8 w-20" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

function PerformanceChart({
  series,
  loading,
  noDataLabel,
  spendLabel,
  conversionsLabel,
  title,
  metricsLabel
}: {
  series: SeriesPoint[];
  loading: boolean;
  noDataLabel: string;
  spendLabel: string;
  conversionsLabel: string;
  title: string;
  metricsLabel: string;
}) {
  const maxSpend = Math.max(...series.map((s) => s.spend), 1);
  const maxConv = Math.max(...series.map((s) => s.conversions), 1);

  return (
    <div className="ui-card p-4 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-400">{metricsLabel}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-violet-500" /> {spendLabel}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> {conversionsLabel}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-44 w-full rounded-lg" />
      ) : series.length ? (
        <div className="mt-4 flex items-end gap-1" style={{ height: CHART_HEIGHT + 20 }}>
          {series.map((p) => {
            const spendH = Math.max(4, (p.spend / maxSpend) * CHART_HEIGHT);
            const convH = Math.max(4, (p.conversions / maxConv) * CHART_HEIGHT);
            return (
              <div key={p.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end justify-center gap-0.5" style={{ height: CHART_HEIGHT }}>
                  <div className="w-1/2 rounded-t bg-violet-500/90" style={{ height: spendH }} />
                  <div className="w-1/2 rounded-t bg-blue-400/80" style={{ height: convH }} />
                </div>
                <span className="text-[9px] text-slate-400">
                  {p.day.slice(8, 10)}/{p.day.slice(5, 7)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">{noDataLabel}</p>
      )}
    </div>
  );
}

function DeltaBadge({ value, invert }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const cls = good ? "text-emerald-600" : value === 0 ? "text-slate-400" : "text-rose-600";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`text-[11px] font-medium ${cls}`}>
      {sign}
      {value.toFixed(1).replace(".", ",")}% {invert ? "" : ""}
    </span>
  );
}

export function CampaignManagerClient({
  metaCampaignId,
  clientSlug,
  tab,
  embedded = false,
  periodQuery = "",
  seedRow
}: {
  metaCampaignId: string;
  clientSlug: string;
  tab: "overview" | "adsets";
  embedded?: boolean;
  /** Query string from PeriodFilter, e.g. `?period=last7` */
  periodQuery?: string;
  seedRow?: CampaignSeedRow;
}) {
  const t = useTranslations("campaignManager");
  const locale = useLocale();
  const { openPanel } = usePublishPanel();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [adsets, setAdsets] = useState<AdSetRow[]>([]);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [previous, setPrevious] = useState<PrevPeriod | null>(null);
  const [adsCount, setAdsCount] = useState(0);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<DetailTab>(tab);
  const [refreshing, setRefreshing] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    setActiveTab(embedded ? "overview" : tab);
  }, [metaCampaignId, embedded, tab]);

  const reload = useCallback(() => {
    const qs = buildDetailQuery(periodQuery, seedRow);
    setRefreshing(true);
    setChartLoading(true);

    const detailPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.campaign) {
          setCampaign(j.campaign);
          rememberCampaign(metaCampaignId, j.campaign.clientSlug || clientSlug);
        }
      });

    const adsetsPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/adsets${qs}`)
      .then((r) => r.json())
      .then(async (j) => {
        const list = (j.adsets ?? []) as AdSetRow[];
        setAdsets(list);
        let totalAds = 0;
        for (const a of list.slice(0, 8)) {
          try {
            const ar = await fetch(`/api/adsets/${encodeURIComponent(a.id)}/ads`);
            const aj = await ar.json();
            totalAds += (aj.ads ?? []).length;
          } catch {
            /* skip */
          }
        }
        setAdsCount(totalAds);
      })
      .catch(() => setAdsets([]));

    const timeseriesPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/timeseries${qs}`)
      .then((r) => r.json())
      .then((j) => {
        setSeries(j.series ?? []);
        setPrevious(j.previous ?? null);
      })
      .finally(() => setChartLoading(false));

    void Promise.all([detailPromise, adsetsPromise, timeseriesPromise]).finally(() => {
      setRefreshing(false);
    });
  }, [metaCampaignId, clientSlug, periodQuery, seedRow]);

  useEffect(() => {
    if (seedRow && seedRow.metaCampaignId === metaCampaignId) {
      setCampaign(campaignFromSeed(seedRow, metaCampaignId));
    }
  }, [seedRow, metaCampaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filteredAdsets = useMemo(() => {
    if (!search.trim()) return adsets;
    const q = search.toLowerCase();
    return adsets.filter((a) => (a.name ?? a.id).toLowerCase().includes(q));
  }, [adsets, search]);

  const spendSeries = series.map((s) => s.spend);
  const convSeries = series.map((s) => s.conversions);
  const cpaSeries = series.map((s) => (s.cpa != null ? s.cpa : 0));
  const roasSeries = series.map((s) => s.roas);

  const adsetTotals = useMemo(
    () => ({
      spend: adsets.reduce((s, a) => s + a.spend, 0),
      conversions: adsets.reduce((s, a) => s + a.conversions, 0),
      cpa:
        adsets.reduce((s, a) => s + a.conversions, 0) > 0
          ? adsets.reduce((s, a) => s + a.spend, 0) / adsets.reduce((s, a) => s + a.conversions, 0)
          : null,
      roas:
        adsets.length > 0 ? adsets.reduce((s, a) => s + a.roas, 0) / adsets.length : 0
    }),
    [adsets]
  );

  const campaignAction = (action: "pause" | "activate") => {
    startTransition(async () => {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      const j = await res.json();
      setMessage(j.ok ? t(action === "pause" ? "paused" : "activated") : j.error);
      reload();
    });
  };

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
    return <CampaignDetailSkeleton compact={embedded} />;
  }

  const slug = campaign.clientSlug || clientSlug;
  const tabs: Array<{ id: DetailTab; href?: string; label: string; disabled?: boolean }> = [
    {
      id: "overview",
      href: embedded ? undefined : `/campaigns/${metaCampaignId}?client=${encodeURIComponent(slug)}`,
      label: t("tabOverview")
    },
    {
      id: "adsets",
      href: embedded
        ? undefined
        : `/campaigns/${metaCampaignId}/adsets?client=${encodeURIComponent(slug)}`,
      label: t("tabAdsets", { count: adsets.length })
    },
    { id: "ads", href: embedded ? undefined : "#", label: t("tabAds", { count: adsCount }), disabled: true },
    {
      id: "creatives",
      href: embedded ? undefined : "/creatives",
      label: t("tabCreatives"),
      disabled: embedded
    },
    { id: "events", href: embedded ? undefined : "#", label: t("tabEvents"), disabled: true }
  ];

  const prev = previous ?? { spend: 0, conversions: 0, cpa: null, roas: 0 };

  return (
    <div className="space-y-4">
      {!embedded ? (
        <p className="text-xs text-slate-500">
          <Link href="/campaigns" className="hover:text-violet-600">
            {t("navCampaigns")}
          </Link>
          {" › "}
          <span className="text-slate-700">{campaign.name}</span>
          {activeTab === "adsets" ? ` › ${t("adsetsTitle")}` : null}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <Badge variant={statusVariant(campaign.status)}>{statusLabel(campaign.status, t)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-4 w-4 rounded bg-blue-600 text-[8px] font-bold leading-4 text-white text-center">
                f
              </span>
              ID: {campaign.id}
            </span>
            <span>
              {t("client")}:{" "}
              <Link href={`/clients/${slug}`} className="font-medium text-slate-700 hover:text-violet-600">
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
              <strong className="text-slate-800">
                {campaign.dailyBudget != null ? formatBRL(campaign.dailyBudget, locale) : "—"}
              </strong>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            {t("dateRange")}
          </div>
          <button type="button" className="ui-btn-secondary text-xs">
            {t("comparePeriod")}
          </button>
          <button type="button" onClick={reload} className="ui-btn-secondary px-3 text-sm" title={t("refresh")}>
            ↻
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen((o) => !o)}
              className="ui-btn-primary text-sm"
            >
              {t("actions")} ▾
            </button>
            {actionsOpen ? (
              <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    campaignAction("pause");
                    setActionsOpen(false);
                  }}
                >
                  {t("pause")}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    campaignAction("activate");
                    setActionsOpen(false);
                  }}
                >
                  {t("activate")}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    openPanel({ clientSlug: slug });
                    setActionsOpen(false);
                  }}
                >
                  {t("duplicate")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((item) => {
          const isActive = activeTab === item.id;
          const tabClass = `whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
            isActive
              ? "border-violet-600 text-violet-600"
              : item.disabled
                ? "border-transparent text-slate-300"
                : "border-transparent text-slate-500 hover:text-slate-700"
          }`;

          if (embedded || !item.href || item.href === "#") {
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) setActiveTab(item.id);
                }}
                className={tabClass}
              >
                {item.label}
              </button>
            );
          }

          return (
            <Link key={item.id} href={item.href} className={tabClass}>
              {item.label}
            </Link>
          );
        })}
      </div>

      {message ? <div className="text-xs text-emerald-700">{message}</div> : null}

      {activeTab === "overview" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {refreshing && !spendSeries.length ? (
                [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-24 rounded-xl" />)
              ) : (
                <>
                  <KpiCard
                    label={t("kpiSpend")}
                    value={formatBRL(campaign.kpis.spend, locale)}
                    delta={pctDelta(campaign.kpis.spend, prev.spend)}
                    series={spendSeries}
                    color="#7c3aed"
                  />
                  <KpiCard
                    label={t("kpiConversions")}
                    value={formatNumber(campaign.kpis.conversions, locale)}
                    delta={pctDelta(campaign.kpis.conversions, prev.conversions)}
                    series={convSeries}
                    color="#2563eb"
                  />
                  <KpiCard
                    label={t("kpiCpa")}
                    value={campaign.kpis.cpa != null ? formatBRL(campaign.kpis.cpa, locale) : "—"}
                    delta={pctDelta(campaign.kpis.cpa ?? 0, prev.cpa ?? 0)}
                    series={cpaSeries}
                    color="#ea580c"
                    invertDelta
                  />
                  <KpiCard
                    label={t("kpiRoas")}
                    value={formatRoas(campaign.kpis.roas, locale)}
                    delta={pctDelta(campaign.kpis.roas, prev.roas)}
                    series={roasSeries}
                    color="#059669"
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <PerformanceChart
                series={series}
                loading={chartLoading}
                title={t("chartTitle")}
                metricsLabel={t("metrics")}
                spendLabel={t("legendSpend")}
                conversionsLabel={t("legendConversions")}
                noDataLabel={t("noChartData")}
              />

              <div className="ui-card p-4">
                <h2 className="text-sm font-semibold">{t("statusCard")}</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("statusLabel")}</dt>
                    <dd>
                      <Badge variant={statusVariant(campaign.status)}>
                        {statusLabel(campaign.status, t)}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("objective")}</dt>
                    <dd className="font-medium">{campaign.objective}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("dailyBudget")}</dt>
                    <dd className="font-medium">
                      {campaign.dailyBudget != null ? formatBRL(campaign.dailyBudget, locale) : "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <QuickAction icon="⏸" label={t("pause")} onClick={() => campaignAction("pause")} />
                  <QuickAction icon="✏️" label={t("editBudget")} href={`/clients/${slug}`} />
                  <QuickAction icon="📋" label={t("duplicate")} onClick={() => openPanel({ clientSlug: slug })} />
                  <QuickAction
                    icon="↗"
                    label={t("viewMeta")}
                    href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${campaign.metaAdAccountId.replace("act_", "")}&selected_campaign_ids=${campaign.id}`}
                    external
                  />
                </div>
              </div>
            </div>

            <div className="ui-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t("topCreatives")}</h2>
                <Link href="/creatives" className="text-xs font-medium text-violet-600">
                  {t("viewAll")}
                </Link>
              </div>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  >
                    <div className="flex h-24 items-center justify-center text-2xl text-slate-400">🖼</div>
                    <div className="bg-white px-2 py-1.5 text-[10px] text-slate-500">
                      CTR {formatPercent(2 + n * 0.3, 2, locale)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{t("adsetsSidebar")}</h2>
              {embedded ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("adsets")}
                  className="text-xs font-medium text-violet-600 hover:underline"
                >
                  {t("viewAdsets")}
                </button>
              ) : (
                <Link
                  href={`/campaigns/${metaCampaignId}/adsets?client=${encodeURIComponent(slug)}`}
                  className="text-xs font-medium text-violet-600"
                >
                  {t("viewAdsets")}
                </Link>
              )}
              <button
                type="button"
                onClick={() => openPanel({ clientSlug: slug })}
                className="ui-btn-primary px-2 py-1 text-[11px]"
              >
                + {t("newAdset")}
              </button>
            </div>
            {refreshing && !adsets.length ? (
              [1, 2].map((n) => <Skeleton key={n} className="h-32 rounded-xl" />)
            ) : (
              adsets.map((a) => (
              <div key={a.id} className="ui-card p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900">{a.name ?? a.id}</div>
                  <Badge variant={statusVariant(a.status ?? "")}>{statusLabel(a.status ?? "", t)}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <Metric label={t("spend7d")} value={formatBRL(a.spend, locale)} />
                  <Metric label={t("conversions")} value={String(a.conversions)} />
                  <Metric label="CPA" value={a.cpa != null ? formatBRL(a.cpa, locale) : "—"} />
                  <Metric label="ROAS" value={formatRoas(a.roas, locale)} />
                  <Metric label={t("reach")} value={formatNumber(a.reach, locale)} />
                  <Metric label="CTR" value={formatPercent(a.ctr, 2, locale)} />
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  {t("dailyBudget")}: {a.dailyBudget != null ? formatBRL(a.dailyBudget, locale) : "—"}
                </div>
                <div className="mt-3 flex gap-3 border-t border-slate-100 pt-2 text-[11px]">
                  {embedded ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("adsets")}
                      className="font-medium text-violet-600 hover:underline"
                    >
                      {t("viewDetail")}
                    </button>
                  ) : (
                    <Link
                      href={`/campaigns/${metaCampaignId}/adsets?client=${encodeURIComponent(slug)}`}
                      className="font-medium text-violet-600"
                    >
                      {t("viewDetail")}
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => adsetAction(a.id, a.status === "ACTIVE" ? "pause" : "activate")}
                    className="font-medium text-slate-600 hover:text-violet-600"
                  >
                    {a.status === "ACTIVE" ? t("pause") : t("activate")}
                  </button>
                </div>
              </div>
            ))
            )}
            {!refreshing && !adsets.length ? <p className="text-xs text-slate-500">{t("noAdsets")}</p> : null}

            {adsets.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="font-semibold text-slate-700">{t("adsetsSummary")}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <span>
                    {t("totalSpend")}: <strong>{formatBRL(adsetTotals.spend, locale)}</strong>
                  </span>
                  <span>
                    {t("totalConversions")}: <strong>{adsetTotals.conversions}</strong>
                  </span>
                  <span>
                    CPA médio:{" "}
                    <strong>
                      {adsetTotals.cpa != null ? formatBRL(adsetTotals.cpa, locale) : "—"}
                    </strong>
                  </span>
                  <span>
                    ROAS médio: <strong>{formatRoas(adsetTotals.roas, locale)}</strong>
                  </span>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : activeTab === "adsets" ? (
        refreshing && !adsets.length ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full max-w-md rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <AdsetsTable
            filteredAdsets={filteredAdsets}
            search={search}
            setSearch={setSearch}
            metaCampaignId={metaCampaignId}
            slug={slug}
            locale={locale}
            t={t}
            isPending={isPending}
            adsetAction={adsetAction}
          />
        )
      ) : (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("comingSoon")}</div>
      )}

      <p className="text-[10px] text-slate-400">{t("dataNote")}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  series,
  color,
  invertDelta
}: {
  label: string;
  value: string;
  delta: number;
  series: number[];
  color: string;
  invertDelta?: boolean;
}) {
  return (
    <div className="ui-card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
      <DeltaBadge value={delta} invert={invertDelta} />
      <Sparkline values={series} color={color} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-400">{label}</div>
      <div className="font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  href,
  external
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}) {
  const inner = (
    <>
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] font-medium text-slate-600">{label}</span>
    </>
  );
  const cls =
    "flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-white";
  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function AdsetsTable({
  filteredAdsets,
  search,
  setSearch,
  metaCampaignId,
  slug,
  locale,
  t,
  isPending,
  adsetAction
}: {
  filteredAdsets: AdSetRow[];
  search: string;
  setSearch: (v: string) => void;
  metaCampaignId: string;
  slug: string;
  locale: string;
  t: (k: string, p?: Record<string, string | number>) => string;
  isPending: boolean;
  adsetAction: (id: string, action: "pause" | "activate") => void;
}) {
  const { openPanel } = usePublishPanel();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchAdsets")}
          className="ui-input min-w-[200px] flex-1"
        />
        <button type="button" onClick={() => openPanel({ clientSlug: slug })} className="ui-btn-primary text-sm">
          + {t("newAdset")}
        </button>
      </div>
      <div className="ui-card overflow-hidden">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t("colAdset")}</th>
              <th className="px-3 py-3">{t("statusLabel")}</th>
              <th className="px-3 py-3">{t("spend7d")}</th>
              <th className="px-3 py-3">{t("conversions")}</th>
              <th className="px-3 py-3">CPA</th>
              <th className="px-3 py-3">ROAS</th>
              <th className="px-3 py-3">{t("reach")}</th>
              <th className="px-3 py-3">CTR</th>
              <th className="px-3 py-3">{t("dailyBudget")}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredAdsets.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{a.name ?? a.id}</div>
                  <div className="text-[10px] text-slate-400">{a.id}</div>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={statusVariant(a.status ?? "")}>{statusLabel(a.status ?? "", t)}</Badge>
                </td>
                <td className="px-3 py-3 font-medium">{formatBRL(a.spend, locale)}</td>
                <td className="px-3 py-3">{a.conversions}</td>
                <td className="px-3 py-3">{a.cpa != null ? formatBRL(a.cpa, locale) : "—"}</td>
                <td className="px-3 py-3">{formatRoas(a.roas, locale)}</td>
                <td className="px-3 py-3">{formatNumber(a.reach, locale)}</td>
                <td className="px-3 py-3">{formatPercent(a.ctr, 2, locale)}</td>
                <td className="px-3 py-3">
                  {a.dailyBudget != null ? formatBRL(a.dailyBudget, locale) : "—"}
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => adsetAction(a.id, a.status === "ACTIVE" ? "pause" : "activate")}
                    className="text-xs font-medium text-violet-600 hover:underline"
                  >
                    {a.status === "ACTIVE" ? t("pause") : t("activate")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
