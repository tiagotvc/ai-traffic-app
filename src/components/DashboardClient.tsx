"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Link } from "@/i18n/navigation";
import { MetricPickerModal } from "@/components/MetricPickerModal";
import { PeriodFilter, type PeriodState, periodStateToQuery } from "@/components/PeriodFilter";
import { SyncRefreshButton } from "@/components/SyncRefreshButton";
import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";
import {
  MAX_CHART_METRICS,
  METRIC_BY_KEY,
  METRIC_CATALOG,
  QUICK_METRICS,
  formatMetricValue,
  type MetricKey
} from "@/lib/dashboard-metrics";
import { DEFAULT_REPORT_TZ } from "@/lib/report-period";
import {
  buildQuery,
  formatDayLabel,
  pctDelta,
  resolveRanges,
  type Range
} from "@/lib/dashboard-ranges";
import { presetMetricsFor } from "@/lib/campaign-presets";
import {
  CardsRowSkeleton,
  ChartCardSkeleton,
  Skeleton,
  SupportStripSkeleton
} from "@/components/ui/Skeleton";

const COST_METRICS = new Set<MetricKey>(["spend", "cpc", "cpm", "cpa", "cpmsg"]);

type Summary = Partial<Record<MetricKey, number>>;

type SeriesPoint = { day: string } & Partial<Record<MetricKey, number>>;
type AlertItem = {
  id: string;
  title: string;
  description: string;
  severity?: string;
  clientId?: string | null;
  metaCampaignId?: string | null;
};
type ClientCard = {
  id: string;
  slug: string;
  name: string;
  roas: number;
  metrics?: Partial<Record<MetricKey, number>>;
  dominantPreset?: string;
  alertCount?: number;
};
type AdAccountOpt = {
  id: string;
  metaAdAccountId: string;
  label: string;
  timezone?: string | null;
};
type VariationLite = {
  id: string;
  metric: MetricKey;
  deltaPct: number;
  direction: "up" | "down";
  severity: "critical" | "warning" | "positive";
  entityName: string | null;
};

function DeltaBadge({
  delta,
  goodWhen,
  locale,
  noPrevLabel
}: {
  delta: number | null;
  goodWhen: "up" | "neutral";
  locale: string;
  noPrevLabel: string;
}) {
  if (delta === null) {
    return <span className="text-[11px] text-slate-400">{noPrevLabel}</span>;
  }
  const up = delta >= 0;
  const color =
    goodWhen === "neutral"
      ? "bg-violet-50 text-violet-700"
      : up === (goodWhen === "up")
        ? "bg-emerald-50 text-emerald-700"
        : "bg-rose-50 text-rose-700";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      <span className="leading-none">{up ? "▲" : "▼"}</span>
      {formatPercent(Math.abs(delta), 1, locale)}
    </span>
  );
}

function HighlightCard({
  id,
  label,
  value,
  delta,
  goodWhen,
  data,
  dataKey,
  color,
  vsLabel,
  noPrevLabel,
  locale
}: {
  id: string;
  label: string;
  value: string;
  delta: number | null;
  goodWhen: "up" | "neutral";
  data: Array<{ label: string } & Record<string, number | string | undefined>>;
  dataKey: string;
  color: string;
  vsLabel: string;
  noPrevLabel: string;
  locale: string;
}) {
  return (
    <div className="ui-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <DeltaBadge delta={delta} goodWhen={goodWhen} locale={locale} noPrevLabel={noPrevLabel} />
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{vsLabel}</div>
      <div className="mt-3 h-16">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" hide />
              <defs>
                <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 11
                }}
                labelStyle={{ color: "#64748b" }}
                formatter={(value) => [formatMetricValue(dataKey as MetricKey, Number(value), locale), label]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${id})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}

function SupportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function DashboardClient() {
  const t = useTranslations("dashboard");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [period, setPeriod] = useState<PeriodState>({ preset: "thisWeek", since: "", until: "" });
  const [chartMetrics, setChartMetrics] = useState<MetricKey[]>(["spend", "conversions"]);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [clientMetric, setClientMetric] = useState<MetricKey>("roas");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [variations, setVariations] = useState<VariationLite[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<AlertItem[]>([]);
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccountOpt[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  // Fuso da conta selecionada (vindo da Meta). Sem conta específica → fuso padrão.
  const selectedTz = useMemo(() => {
    if (!accountFilter) return undefined;
    return adAccounts.find((a) => a.id === accountFilter)?.timezone || undefined;
  }, [accountFilter, adAccounts]);
  const activeTz = selectedTz ?? DEFAULT_REPORT_TZ;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { current, previous } = resolveRanges(period, selectedTz);
      const curQ = buildQuery(clientFilter, accountFilter, current);
      // Caixa de variações segue o período da página (mesma janela do seletor).
      const varDays = current
        ? Math.min(90, Math.max(1, Math.round((Date.parse(current.until) - Date.parse(current.since)) / 86_400_000) + 1))
        : 90;
      const [sRes, tRes, aRes, critRes, pRes] = await Promise.all([
        fetch(`/api/dashboard/summary?${curQ}`),
        fetch(`/api/dashboard/timeseries?${curQ}`),
        fetch(
          `/api/alerts/variations?level=client&days=${varDays}${
            clientFilter ? `&clientId=${encodeURIComponent(clientFilter)}` : ""
          }`
        ),
        fetch("/api/alerts?severity=critical&limit=8"),
        previous
          ? fetch(`/api/dashboard/summary?${buildQuery(clientFilter, accountFilter, previous)}`)
          : Promise.resolve<Response | null>(null)
      ]);

      const sJson = await sRes.json();
      const tJson = await tRes.json();
      const aJson = await aRes.json();
      const critJson = await critRes.json();
      const pJson = pRes ? await pRes.json() : null;

      setSummary(sJson.summary);
      setPrevSummary(pJson?.summary ?? null);
      setSeries(tJson.series ?? []);
      setVariations(aJson.items ?? []);
      setCriticalAlerts(critJson.alerts ?? []);
      setAdAccounts(sJson.adAccounts ?? []);
      setNote(null);
    } catch {
      setNote(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [clientFilter, accountFilter, period, selectedTz, t]);

  // Clientes seguem o MESMO período do seletor principal da página.
  const loadClients = useCallback(() => {
    const qs = periodStateToQuery(period).toString();
    fetch(`/api/clients?${qs}`)
      .then((r) => r.json())
      .then((j) => setClients(j.clients ?? []))
      .catch(() => {});
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    const onSync = () => {
      void load();
      loadClients();
    };
    window.addEventListener("traffic-sync-done", onSync);
    return () => window.removeEventListener("traffic-sync-done", onSync);
  }, [load, loadClients]);

  const spark = useMemo(
    () => series.map((p) => ({ ...p, label: formatDayLabel(p.day, locale) })),
    [series, locale]
  );

  // Métricas de destaque conforme o tipo dominante do cliente selecionado.
  const heroMetrics = useMemo(() => {
    const dominant = clientFilter
      ? clients.find((c) => c.slug === clientFilter)?.dominantPreset
      : undefined;
    return presetMetricsFor(dominant).slice(0, 3);
  }, [clientFilter, clients]);

  const chartData = series.map((p) => ({ ...p, label: formatDayLabel(p.day, locale) }));
  const vsLabel = t("vsPrevPeriod");
  const noPrev = t("noPrevData");

  function heroDelta(key: MetricKey): number | null {
    const prev = prevSummary?.[key];
    if (prev == null || prev <= 0) return null;
    return pctDelta(summary?.[key] ?? 0, prev);
  }

  function toggleChartMetric(key: MetricKey) {
    setChartMetrics((cur) =>
      cur.includes(key)
        ? cur.length > 1
          ? cur.filter((k) => k !== key)
          : cur
        : cur.length >= MAX_CHART_METRICS
          ? cur
          : [...cur, key]
    );
  }

  return (
    <div className="space-y-4">
      {/* Highlights header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("highlights")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("highlightsSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncRefreshButton />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            {t("currencyLabel")}: BRL
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
            title={t("timezoneHint")}
          >
            {t("timezoneLabel")}: {activeTz}
          </span>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 ui-card p-4">
        <div>
          <div className="text-xs text-slate-500">{t("filterClient")}</div>
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setAccountFilter("");
            }}
            className="mt-1 ui-select"
          >
            <option value="">{t("filterAllClients")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("filterAccount")}</div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="mt-1 ui-select"
          >
            <option value="">{t("filterAllAccounts")}</option>
            {adAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {criticalAlerts.length > 0 ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">{t("attentionTitle")}</div>
          <div className="mt-1 text-xs text-rose-600/80">{t("attentionSubtitle")}</div>
          <div className="mt-3 space-y-2">
            {criticalAlerts.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-rose-200 bg-white p-3"
              >
                <div>
                  <div className="text-xs font-semibold text-rose-700">{a.title}</div>
                  <div className="mt-1 text-xs text-slate-600">{a.description}</div>
                </div>
                {a.clientId ? (
                  <Link
                    href={`/clients/${clients.find((c) => c.id === a.clientId)?.slug ?? ""}`}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-500"
                  >
                    {t("viewClient")}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {note ? <div className="ui-alert-info">{note}</div> : null}

      {loading || !summary ? (
        <div className="space-y-4">
          <CardsRowSkeleton />
          <SupportStripSkeleton />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCardSkeleton />
            </div>
            <div className="ui-card space-y-2 p-4">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="ui-card space-y-3 p-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Hero highlight cards — adaptam ao tipo dominante do cliente */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {heroMetrics.map((key) => (
              <HighlightCard
                key={key}
                id={key}
                label={tMetrics(METRIC_BY_KEY[key].label)}
                value={formatMetricValue(key, summary[key] ?? 0, locale)}
                delta={heroDelta(key)}
                goodWhen={COST_METRICS.has(key) ? "neutral" : "up"}
                data={spark}
                dataKey={key}
                color={METRIC_BY_KEY[key].color}
                vsLabel={vsLabel}
                noPrevLabel={noPrev}
                locale={locale}
              />
            ))}
          </section>

          {/* Supporting metrics strip */}
          <section className="ui-card">
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("supportingTitle")}
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-5">
              <SupportStat label={t("impressions")} value={formatNumber(summary.impressions ?? 0, locale)} />
              <SupportStat label={t("clicks")} value={formatNumber(summary.clicks ?? 0, locale)} />
              <SupportStat label={t("ctr")} value={formatPercent(summary.ctr ?? 0, 2, locale)} />
              <SupportStat label={t("avgCpc")} value={formatBRL(summary.cpc ?? 0, locale)} />
              <SupportStat
                label={t("cpa")}
                value={summary.cpa && summary.cpa > 0 ? formatBRL(summary.cpa, locale) : "—"}
              />
            </div>
          </section>

          {/* Performance chart + alerts */}
          <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2 ui-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">{t("metricsChartTitle")}</div>
                <button
                  type="button"
                  onClick={() => setMetricsModalOpen(true)}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-500"
                >
                  + {t("seeMore")}
                </button>
              </div>

              {/* Quick metric chips (até 3) */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {QUICK_METRICS.map((key) => {
                  const def = METRIC_BY_KEY[key];
                  const active = chartMetrics.includes(key);
                  const disabled = !active && chartMetrics.length >= MAX_CHART_METRICS;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleChartMetric(key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "border-transparent text-white"
                          : disabled
                            ? "cursor-not-allowed border-slate-200 text-slate-300"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      style={active ? { background: def.color } : undefined}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: active ? "rgba(255,255,255,0.85)" : def.color }}
                      />
                      {tMetrics(def.label)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 h-56">
                {chartData.length >= 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      {chartMetrics.map((key) => (
                        <YAxis key={key} yAxisId={key} hide domain={["auto", "auto"]} />
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
                      {chartMetrics.map((key) => (
                        <Line
                          key={key}
                          yAxisId={key}
                          type="monotone"
                          dataKey={key}
                          name={tMetrics(METRIC_BY_KEY[key].label)}
                          stroke={METRIC_BY_KEY[key].color}
                          strokeWidth={2}
                          dot={chartData.length === 1}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    {t("noChartData")}
                  </div>
                )}
              </div>
            </div>

            <div className="ui-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{t("alertsTitle")}</div>
                <Link
                  href="/alerts"
                  className="text-xs font-semibold text-violet-600 hover:text-violet-500"
                >
                  {t("viewAllAlerts")}
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {variations.length ? (
                  variations.slice(0, 6).map((v) => {
                    const good = v.severity === "positive";
                    const color = good
                      ? "text-emerald-600"
                      : v.severity === "critical"
                        ? "text-rose-600"
                        : "text-amber-600";
                    return (
                      <div key={v.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-slate-800">
                            {v.entityName ?? tMetrics(METRIC_BY_KEY[v.metric].label)}
                          </span>
                          <span className={`shrink-0 text-xs font-semibold ${color}`}>
                            {v.direction === "up" ? "▲" : "▼"} {Math.abs(v.deltaPct).toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {tMetrics(METRIC_BY_KEY[v.metric].label)} · {t("vsPrevPeriod")}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-500">{t("noAlerts")}</div>
                )}
              </div>
            </div>
          </section>

          {/* Clients */}
          <section className="ui-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{t("clientsTitle")}</div>
                <div className="text-xs text-slate-500">{t("clientsSubtitle")}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">{t("clientMetricLabel")}:</span>
                <select
                  value={clientMetric}
                  onChange={(e) => setClientMetric(e.target.value as MetricKey)}
                  className="ui-select !w-auto !py-1.5 text-xs"
                >
                  {METRIC_CATALOG.map((m) => (
                    <option key={m.key} value={m.key}>
                      {tMetrics(m.label)}
                    </option>
                  ))}
                </select>
                <Link
                  href="/clients"
                  className="text-xs font-semibold text-violet-600 hover:text-violet-500"
                >
                  {t("viewAllClients")}
                </Link>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              {clients.map((c) => {
                const raw =
                  clientMetric === "roas" ? c.roas : c.metrics?.[clientMetric] ?? 0;
                return (
                  <Link
                    key={c.id}
                    href={`/clients/${c.slug}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                      {(c.alertCount ?? 0) > 0 ? (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {c.alertCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {tMetrics(METRIC_BY_KEY[clientMetric].label)}
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {raw ? formatMetricValue(clientMetric, raw, locale) : "—"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      <MetricPickerModal
        open={metricsModalOpen}
        selected={chartMetrics}
        onApply={(next) => {
          setChartMetrics(next);
          setMetricsModalOpen(false);
        }}
        onClose={() => setMetricsModalOpen(false)}
      />
    </div>
  );
}
