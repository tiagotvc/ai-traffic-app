"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
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
import { ClientDetailTabs } from "@/components/client/ClientDetailTabs";
import { MetricPickerModal } from "@/components/MetricPickerModal";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { SyncRefreshButton } from "@/components/SyncRefreshButton";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";
import {
  DEFAULT_DASHBOARD_CHART_METRICS,
  MAX_CHART_METRICS,
  METRIC_BY_KEY,
  QUICK_METRICS,
  formatMetricValue,
  type MetricKey
} from "@/lib/dashboard-metrics";
import { buildQuery, formatDayLabel, pctDelta, resolveRanges } from "@/lib/dashboard-ranges";
import { CAMPAIGN_PRESETS, presetMetricsFor } from "@/lib/campaign-presets";

const COST_METRICS = new Set<MetricKey>(["spend", "cpc", "cpm", "cpa", "cpmsg"]);

type Summary = Partial<Record<MetricKey, number>>;
type SeriesPoint = { day: string } & Partial<Record<MetricKey, number>>;
type CampaignRow = {
  metaCampaignId: string;
  campaignName: string;
  clientSlug: string;
  spend: number;
  conversions: number;
  cpa: number | null;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  messages: number;
  frequency: number;
  status?: string;
  alertCount?: number;
  preset?: string;
};

function campaignMetric(row: CampaignRow, key: MetricKey): number {
  switch (key) {
    case "spend":
      return row.spend;
    case "conversions":
      return row.conversions;
    case "roas":
      return row.roas;
    case "cpa":
      return row.cpa ?? 0;
    case "ctr":
      return row.ctr;
    case "cpc":
      return row.cpc;
    case "cpm":
      return row.cpm;
    case "messages":
      return row.messages;
    case "cpmsg":
      return row.messages > 0 ? row.spend / row.messages : 0;
    case "reach":
      return row.reach;
    case "impressions":
      return row.impressions;
    case "clicks":
      return row.clicks;
    case "frequency":
      return row.frequency;
    default:
      return 0;
  }
}

function statusVariant(status?: string): "success" | "warning" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "PAUSED") return "warning";
  return "neutral";
}

export function ClientOverviewClient({ clientId }: { clientId: string }) {
  const t = useTranslations("clientOverview");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const tCampaigns = useTranslations("campaignsPage");
  const locale = useLocale();

  const [name, setName] = useState("");
  const [dominantPreset, setDominantPreset] = useState<string>("default");
  const [period, setPeriod] = useState<PeriodState>({ preset: "thisWeek", since: "", until: "" });
  const [userChartMetrics, setUserChartMetrics] = useState<MetricKey[]>(DEFAULT_DASHBOARD_CHART_METRICS);
  const [chartMetrics, setChartMetrics] = useState<MetricKey[]>(DEFAULT_DASHBOARD_CHART_METRICS);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [presets, setPresets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const reloadPresets = useCallback(() => {
    return fetch("/api/campaign-presets")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPresets((prev) => ({ ...prev, ...(j.presets ?? {}) }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void reloadPresets();
  }, [reloadPresets]);

  const persistChartMetrics = useCallback(
    (next: MetricKey[]) => {
      void fetch(`/api/clients/${encodeURIComponent(clientId)}/meta-settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ defaultDashboardMetrics: next })
      });
    },
    [clientId]
  );

  const applyChartMetrics = useCallback(
    (next: MetricKey[]) => {
      setChartMetrics(next);
      persistChartMetrics(next);
    },
    [persistChartMetrics]
  );

  // Preferências do usuário (workspace) — fallback quando o cliente não tem defaults.
  useEffect(() => {
    let mounted = true;
    fetch("/api/settings/dashboard-prefs")
      .then((r) => r.json())
      .then((j) => {
        if (!mounted || !j.ok || !Array.isArray(j.dashboardChartMetrics)) return;
        setUserChartMetrics(j.dashboardChartMetrics as MetricKey[]);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Defaults do cliente; sem configuração, usa preferência do usuário.
  useEffect(() => {
    let mounted = true;
    fetch(`/api/clients/${encodeURIComponent(clientId)}/meta-settings`)
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        const metrics = j.settings?.defaultDashboardMetrics;
        if (Array.isArray(metrics) && metrics.length) {
          setChartMetrics(metrics as MetricKey[]);
        } else {
          setChartMetrics(userChartMetrics);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [clientId, userChartMetrics]);

  function mergePresetsFromResponse(j: { presets?: Record<string, string>; rows?: CampaignRow[] }) {
    const fromApi = { ...(j.presets ?? {}) };
    for (const r of j.rows ?? []) {
      if (r.preset) fromApi[r.metaCampaignId] = r.preset;
    }
    if (Object.keys(fromApi).length) {
      setPresets((prev) => ({ ...prev, ...fromApi }));
    }
  }

  function changePreset(metaCampaignId: string, preset: string) {
    setPresets((prev) => ({ ...prev, [metaCampaignId]: preset }));
    void fetch("/api/campaign-presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metaCampaignId, preset })
    });
  }

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => {
        const c = (j.clients ?? []).find((x: { slug: string }) => x.slug === clientId);
        if (c) {
          setName(c.name);
          setDominantPreset(c.dominantPreset ?? "default");
        }
      })
      .catch(() => {});
  }, [clientId]);

  const load = useCallback(async (opts?: { afterSync?: boolean }) => {
    setLoading(true);
    try {
      const { current, previous } = resolveRanges(period);
      const curQ = buildQuery(clientId, "", current);
      const campQ = periodStateToQuery(period).toString();
      const liveSuffix =
        opts?.afterSync || period.preset === "today" ? "&live=1&refresh=1" : "";
      const [sRes, tRes, pRes, cRes] = await Promise.all([
        fetch(`/api/dashboard/summary?${curQ}`),
        fetch(`/api/dashboard/timeseries?${curQ}`),
        previous
          ? fetch(`/api/dashboard/summary?${buildQuery(clientId, "", previous)}`)
          : Promise.resolve<Response | null>(null),
        fetch(
          `/api/command-center/campaigns?clientId=${encodeURIComponent(clientId)}&status=ACTIVE&${campQ}${liveSuffix}`
        )
      ]);
      const sJson = await sRes.json();
      const tJson = await tRes.json();
      const pJson = pRes ? await pRes.json() : null;
      const cJson = await cRes.json();
      setSummary(sJson.summary);
      setPrevSummary(pJson?.summary ?? null);
      setSeries(tJson.series ?? []);
      mergePresetsFromResponse(cJson);
      setCampaigns(cJson.rows ?? []);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [clientId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSync = () => {
      void reloadPresets();
      void load({ afterSync: true });
    };
    window.addEventListener("traffic-sync-done", onSync);
    return () => window.removeEventListener("traffic-sync-done", onSync);
  }, [load, reloadPresets]);

  const chartData = series.map((p) => ({ ...p, label: formatDayLabel(p.day, locale) }));
  const metricSeries = (key: MetricKey) => series.map((p) => Number(p[key] ?? 0));
  const heroMetrics = presetMetricsFor(dominantPreset).slice(0, 3);

  function kpiDelta(key: MetricKey) {
    const cur = summary?.[key] ?? 0;
    const prev = prevSummary?.[key];
    if (prev == null) return {};
    const d = pctDelta(cur, prev);
    if (d == null) return {};
    const positive = COST_METRICS.has(key) ? d <= 0 : d >= 0;
    const text = `${d >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(d), 1, locale)} ${t("vsPrev")}`;
    return { delta: text, deltaPositive: positive };
  }

  function toggleChartMetric(key: MetricKey) {
    setChartMetrics((cur) => {
      const next = cur.includes(key)
        ? cur.length > 1
          ? cur.filter((k) => k !== key)
          : cur
        : cur.length >= MAX_CHART_METRICS
          ? cur
          : [...cur, key];
      if (next !== cur) persistChartMetrics(next);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/clients" className="text-xs font-medium text-slate-500 hover:text-slate-700">
            ← {t("breadcrumb")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {name || t("client")}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncRefreshButton clientId={clientId} />
          <PeriodFilter value={period} onChange={setPeriod} />
          <Link href={`/clients/${clientId}/settings`} className="ui-btn-secondary text-sm">
            {t("editButton")}
          </Link>
        </div>
      </div>

      <ClientDetailTabs clientSlug={clientId} activeTab="overview" />

      {/* KPIs — adaptam ao tipo dominante das campanhas do cliente */}
      <div className="grid gap-3 sm:grid-cols-3">
        {heroMetrics.map((key) => (
          <KpiCard
            key={key}
            label={tMetrics(METRIC_BY_KEY[key].label)}
            value={formatMetricValue(key, summary?.[key] ?? 0, locale)}
            sparkline={metricSeries(key)}
            sparkColor={METRIC_BY_KEY[key].color}
            {...kpiDelta(key)}
          />
        ))}
      </div>

      {/* Performance chart */}
      <div className="ui-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">{t("performance")}</div>
          <button
            type="button"
            onClick={() => setMetricsModalOpen(true)}
            className="text-xs font-semibold text-violet-600 hover:text-violet-500"
          >
            + {t("seeMore")}
          </button>
        </div>

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

      {/* Campanhas ativas */}
      <div className="ui-card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
          {t("campaignsTitle")}
        </div>
        {loading ? (
          <TableSkeleton bare rows={4} columns={["media", "badge", "select", "wide"]} />
        ) : campaigns.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{t("noCampaigns")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 font-medium">{t("colCampaign")}</th>
                  <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
                  <th className="px-3 py-2 font-medium">{tPresets("label")}</th>
                  <th className="px-4 py-2 font-medium">{t("keyMetrics")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => {
                  const preset = presets[c.metaCampaignId] ?? c.preset ?? "default";
                  const metrics = presetMetricsFor(preset);
                  return (
                    <tr key={c.metaCampaignId} className="align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/campaigns/${c.metaCampaignId}?client=${encodeURIComponent(c.clientSlug || clientId)}`}
                          className="font-medium text-slate-800 hover:text-violet-700 hover:underline"
                        >
                          {c.campaignName}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={statusVariant(c.status)}>
                        {c.status === "ACTIVE"
                          ? tCampaigns("statusActive")
                          : c.status === "PAUSED"
                            ? tCampaigns("statusPaused")
                            : tCampaigns("statusInactive")}
                      </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={preset}
                          onChange={(e) => changePreset(c.metaCampaignId, e.target.value)}
                          className="ui-select !w-auto !py-1.5 text-xs"
                        >
                          {CAMPAIGN_PRESETS.map((p) => (
                            <option key={p} value={p}>
                              {tPresets(p)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {metrics.map((key) => (
                            <div key={key} className="min-w-[64px]">
                              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                                {tMetrics(METRIC_BY_KEY[key].label)}
                              </div>
                              <div className="text-sm font-semibold tabular-nums text-slate-800">
                                {formatMetricValue(key, campaignMetric(c, key), locale)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MetricPickerModal
        open={metricsModalOpen}
        selected={chartMetrics}
        onApply={(next) => {
          applyChartMetrics(next);
          setMetricsModalOpen(false);
        }}
        onClose={() => setMetricsModalOpen(false)}
      />
    </div>
  );
}
