"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { rememberCampaign } from "@/components/CampaignsListClient";
import { BudgetEditDrawer } from "@/components/campaign/BudgetEditDrawer";
import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";
import { campaignAdsHref, rememberAdset } from "@/lib/campaign-navigation";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";
import { CampaignTableColumnsButton } from "@/components/CampaignTableColumnsButton";
import { CampaignTableCell } from "@/components/campaign/CampaignTableColumns";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { columnRefKey } from "@/lib/campaign-table-layout";
import {
  customTypesToMap,
  metricsColumnsForPreset
} from "@/lib/campaign-table-metrics";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { META_ACTION_CATALOG } from "@/lib/meta-metrics-catalog";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { ChartContainer } from "@/components/ui/ChartContainer";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatDayLabel } from "@/lib/dashboard-ranges";

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = {
  pause: "M15.75 5.25v13.5m-7.5-13.5v13.5",
  play: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z",
  pencil:
    "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z",
  copy: "M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75",
  external: "M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
} as const;

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

function periodStateFromQuery(periodQuery: string): PeriodState {
  const raw = periodQuery.startsWith("?") ? periodQuery.slice(1) : periodQuery;
  const p = new URLSearchParams(raw);
  const preset = (p.get("period") as PeriodState["preset"]) || "last7";
  return { preset, since: p.get("since") ?? "", until: p.get("until") ?? "" };
}

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

const CHART_METRICS: MetricKey[] = ["spend", "conversions", "cpa", "roas"];

function PerformanceChart({
  series,
  loading,
  noDataLabel,
  title,
  locale
}: {
  series: SeriesPoint[];
  loading: boolean;
  noDataLabel: string;
  title: string;
  locale: string;
}) {
  const tMetrics = useTranslations("metrics");
  const [selected, setSelected] = useState<MetricKey[]>(["spend", "conversions"]);

  const data = series.map((p) => ({
    label: formatDayLabel(p.day, locale),
    spend: p.spend,
    conversions: p.conversions,
    cpa: p.cpa ?? 0,
    roas: p.roas
  }));

  function toggle(m: MetricKey) {
    setSelected((cur) =>
      cur.includes(m) ? (cur.length > 1 ? cur.filter((x) => x !== m) : cur) : [...cur, m]
    );
  }

  return (
    <div className="ui-card p-4 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {CHART_METRICS.map((m) => {
            const on = selected.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggle(m)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  on ? "text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                style={on ? { backgroundColor: METRIC_BY_KEY[m].color } : undefined}
              >
                {tMetrics(METRIC_BY_KEY[m].label)}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-64 w-full rounded-xl" />
      ) : data.length ? (
        <ChartContainer height="h-64" className="mt-4">
          <LineChart data={data}>
              <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              {selected.map((m) => (
                <YAxis key={m} yAxisId={m} hide domain={["auto", "auto"]} />
              ))}
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 12
                }}
                labelStyle={{ color: "#64748b" }}
                formatter={(value, _name, item) => {
                  const key = (item?.dataKey as MetricKey) ?? "spend";
                  return [
                    formatMetricValue(key, Number(value), locale),
                    tMetrics(METRIC_BY_KEY[key].label)
                  ];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {selected.map((m) => (
                <Line
                  key={m}
                  yAxisId={m}
                  type="monotone"
                  dataKey={m}
                  name={tMetrics(METRIC_BY_KEY[m].label)}
                  stroke={METRIC_BY_KEY[m].color}
                  strokeWidth={2}
                  dot={data.length === 1}
                />
              ))}
            </LineChart>
        </ChartContainer>
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
  const [campaignPreset, setCampaignPreset] = useState("default");
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [previous, setPrevious] = useState<PrevPeriod | null>(null);
  const [adsCount, setAdsCount] = useState<number | null>(null);
  const [adsCountLoading, setAdsCountLoading] = useState(true);
  const [creativesCount, setCreativesCount] = useState<number | null>(null);
  const [creativesCountLoading, setCreativesCountLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<DetailTab>(tab);
  const [refreshing, setRefreshing] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [budgetDrawerOpen, setBudgetDrawerOpen] = useState(false);
  const [detailPeriod, setDetailPeriod] = useState<PeriodState>(() =>
    periodStateFromQuery(periodQuery)
  );

  useEffect(() => {
    setActiveTab(embedded ? "overview" : tab);
  }, [metaCampaignId, embedded, tab]);

  // Acompanha o período vindo da lista (hub) como padrão; o usuário pode trocar aqui.
  useEffect(() => {
    setDetailPeriod(periodStateFromQuery(periodQuery));
  }, [periodQuery]);

  const reload = useCallback(() => {
    const qs = buildDetailQuery(`?${periodStateToQuery(detailPeriod).toString()}`, seedRow);
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
      .then((j) => {
        setAdsets((j.adsets ?? []) as AdSetRow[]);
        if (typeof j.preset === "string") setCampaignPreset(j.preset);
      })
      .catch(() => setAdsets([]));

    setAdsCountLoading(true);
    setCreativesCountLoading(true);
    const adsCountPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/ads`)
      .then((r) => r.json())
      .then((j) => setAdsCount(j.total ?? (j.ads ?? []).length))
      .catch(() => setAdsCount(0))
      .finally(() => setAdsCountLoading(false));

    const creativesCountPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/creatives`)
      .then((r) => r.json())
      .then((j) => setCreativesCount(j.total ?? (j.rows ?? []).length))
      .catch(() => setCreativesCount(0))
      .finally(() => setCreativesCountLoading(false));

    const timeseriesPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/timeseries${qs}`)
      .then((r) => r.json())
      .then((j) => {
        setSeries(j.series ?? []);
        setPrevious(j.previous ?? null);
      })
      .finally(() => setChartLoading(false));

    return Promise.all([detailPromise, adsetsPromise, adsCountPromise, creativesCountPromise, timeseriesPromise]).finally(() => {
      setRefreshing(false);
    });
  }, [metaCampaignId, clientSlug, detailPeriod, seedRow]);

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
    setStatusPending(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/actions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action })
        });
        const j = await res.json();
        setMessage(j.ok ? t(action === "pause" ? "paused" : "activated") : j.error);
        // Aguarda a confirmação da Meta (reload refaz o detalhe → status atualizado).
        await reload();
      } finally {
        setStatusPending(false);
      }
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
          <PeriodFilter value={detailPeriod} onChange={setDetailPeriod} />
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

      <CampaignDetailTabs
        metaCampaignId={metaCampaignId}
        clientSlug={slug}
        activeTab={activeTab}
        adsetsCount={adsets.length}
        adsCount={adsCountLoading ? null : adsCount}
        creativesCount={creativesCountLoading ? null : creativesCount}
        embedded={embedded}
        onTabClick={(tabId) => setActiveTab(tabId)}
      />

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
                locale={locale}
                title={t("chartTitle")}
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
                  <QuickAction
                    iconPath={campaign.status === "ACTIVE" ? ICONS.pause : ICONS.play}
                    label={campaign.status === "ACTIVE" ? t("pause") : t("activate")}
                    loading={statusPending}
                    highlight={campaign.status !== "ACTIVE"}
                    onClick={() => campaignAction(campaign.status === "ACTIVE" ? "pause" : "activate")}
                  />
                  <QuickAction
                    iconPath={ICONS.pencil}
                    label={t("editBudget")}
                    onClick={() => setBudgetDrawerOpen(true)}
                  />
                  <QuickAction
                    iconPath={ICONS.copy}
                    label={t("duplicate")}
                    onClick={() => openPanel({ clientSlug: slug })}
                  />
                  <QuickAction
                    iconPath={ICONS.external}
                    label={t("viewMeta")}
                    href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${campaign.metaAdAccountId.replace("act_", "")}&selected_campaign_ids=${campaign.id}`}
                    external
                  />
                </div>
              </div>
            </div>

          </div>

          <aside className="flex max-h-[min(720px,70vh)] flex-col gap-3 overflow-hidden xl:max-h-[calc(100vh-14rem)]">
            <div className="flex shrink-0 items-center justify-between">
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
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {refreshing && !adsets.length ? (
              [1, 2].map((n) => <Skeleton key={n} className="h-32 rounded-xl" />)
            ) : (
              adsets.map((a) => (
              <div key={a.id} className="ui-card p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  {embedded ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("adsets")}
                      className="text-left font-semibold text-slate-900 hover:text-violet-700"
                    >
                      {a.name ?? a.id}
                    </button>
                  ) : (
                    <Link
                      href={`/campaigns/${metaCampaignId}/adsets?client=${encodeURIComponent(slug)}`}
                      className="font-semibold text-slate-900 hover:text-violet-700 hover:underline"
                    >
                      {a.name ?? a.id}
                    </Link>
                  )}
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
            </div>

            {adsets.length > 0 ? (
              <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
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
            campaignPreset={campaignPreset}
          />
        )
      ) : (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("comingSoon")}</div>
      )}

      <p className="text-[10px] text-slate-400">{t("dataNote")}</p>

      <BudgetEditDrawer
        open={budgetDrawerOpen}
        metaCampaignId={metaCampaignId}
        campaignName={campaign.name}
        currentBudget={campaign.dailyBudget}
        locale={locale}
        onClose={() => setBudgetDrawerOpen(false)}
        onSaved={reload}
      />
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
  iconPath,
  label,
  onClick,
  href,
  external,
  loading,
  highlight
}: {
  iconPath: string;
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  loading?: boolean;
  highlight?: boolean;
}) {
  const inner = (
    <>
      <span className={highlight ? "text-violet-600" : "text-slate-500"}>
        {loading ? <Spinner className="h-5 w-5" /> : <Icon d={iconPath} className="h-5 w-5" />}
      </span>
      <span className="text-[10px] font-medium text-slate-600">{label}</span>
    </>
  );
  const cls = `flex flex-col items-center justify-center gap-1 rounded-xl border p-3 transition ${
    highlight
      ? "border-violet-200 bg-violet-50 hover:bg-violet-100"
      : "border-slate-200 bg-slate-50 hover:bg-white"
  } ${loading ? "pointer-events-none opacity-70" : ""}`;
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
    <button type="button" onClick={onClick} disabled={loading} className={cls}>
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
  adsetAction,
  campaignPreset
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
  campaignPreset: string;
}) {
  const { openPanel } = usePublishPanel();
  const tMetrics = useTranslations("metrics");
  const tableLayout = useCampaignTableLayout();
  const { types: customTypes } = useCampaignTypes();
  const customTypesMap = useMemo(() => customTypesToMap(customTypes), [customTypes]);
  const metricColumns = useMemo(
    () => metricsColumnsForPreset(campaignPreset, customTypesMap),
    [campaignPreset, customTypesMap]
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchAdsets")}
          className="ui-input min-w-[200px] flex-1"
        />
        <CampaignTableColumnsButton />
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
              {metricColumns.map((col) => (
                <th key={columnRefKey(col)} className="px-3 py-3 text-right">
                  {metricColLabel(col)}
                </th>
              ))}
              <th className="px-3 py-3">{t("dailyBudget")}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredAdsets.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <Link
                    href={campaignAdsHref(metaCampaignId, slug, a.id)}
                    onClick={() => rememberAdset(metaCampaignId, a.id, a.name ?? a.id)}
                    className="font-medium text-slate-900 hover:text-violet-700 hover:underline"
                  >
                    {a.name ?? a.id}
                  </Link>
                  <div className="text-[10px] text-slate-400">{a.id}</div>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={statusVariant(a.status ?? "")}>{statusLabel(a.status ?? "", t)}</Badge>
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
                      ctr: a.ctr
                    }}
                    customMetrics={tableLayout.customMetricsMap}
                  />
                ))}
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
