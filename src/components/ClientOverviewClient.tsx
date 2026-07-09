"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";
import { ClientDetailTabs } from "@/components/client/ClientDetailTabs";
import { ClientGoogleAdsPanel } from "@/components/ClientGoogleAdsPanel";
import { MetricPickerModal } from "@/components/MetricPickerModal";
import { periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { ChartContainer } from "@/components/ui/ChartContainer";
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
import { CampaignTableColumnsButton } from "@/components/CampaignTableColumnsButton";
import { CampaignTableCell, CampaignTableHead } from "@/components/campaign/CampaignTableColumns";
import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import { CampaignTypeSelectCompact } from "@/components/campaign/CampaignTypeSelectCompact";
import { computeGroupTotals } from "@/lib/campaign-group-totals";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { columnRefKey } from "@/lib/campaign-table-layout";
import {
  customTypesToMap,
  metricsColumnsForPreset
} from "@/lib/campaign-table-metrics";
import {
  STICKY_NAME_TD,
  STICKY_NAME_TF,
  STICKY_NAME_TH,
  STICKY_STATUS_TD,
  STICKY_STATUS_TF,
  STICKY_STATUS_TH
} from "@/lib/campaign-table-sticky";

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

export function ClientOverviewClient({ clientId }: { clientId: string }) {
  const t = useTranslations("clientOverview");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignTypes");
  const tCampaigns = useTranslations("campaignsPage");
  const locale = useLocale();
  const tableLayout = useCampaignTableLayout();
  const { types: customTypes } = useCampaignTypes();
  const strip = useCommandStripOptional();

  useCommandStripPage({});

  useEffect(() => {
    strip?.setClientFilter(clientId);
  }, [clientId, strip]);

  const customMetricNames = Object.fromEntries(
    tableLayout.customMetrics.map((m) => [m.id, m.name])
  );

  const [name, setName] = useState("");
  const [dominantPreset, setDominantPreset] = useState<string>("default");
  const period: PeriodState = strip?.period ?? { preset: "thisWeek", since: "", until: "" };
  const [userChartMetrics, setUserChartMetrics] = useState<MetricKey[]>(DEFAULT_DASHBOARD_CHART_METRICS);
  const [chartMetrics, setChartMetrics] = useState<MetricKey[]>(DEFAULT_DASHBOARD_CHART_METRICS);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [presets, setPresets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [, startStatusTransition] = useTransition();

  const customTypesMap = useMemo(() => customTypesToMap(customTypes), [customTypes]);
  const metricColumns = useMemo(
    () => metricsColumnsForPreset(dominantPreset, customTypesMap),
    [dominantPreset, customTypesMap]
  );

  const campaignMetricRows = useMemo(
    () =>
      campaigns.map((c) => ({
        spend: c.spend,
        conversions: c.conversions,
        cpa: c.cpa,
        roas: c.roas,
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: c.ctr,
        cpc: c.cpc,
        cpm: c.cpm,
        reach: c.reach,
        messages: c.messages,
        frequency: c.frequency
      })),
    [campaigns]
  );

  const campaignTotals = useMemo(
    () => computeGroupTotals(campaignMetricRows, metricColumns, tableLayout.customMetricsMap),
    [campaignMetricRows, metricColumns, tableLayout.customMetricsMap]
  );

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

  function toggleCampaignStatus(metaCampaignId: string, currentStatus?: string) {
    const action = currentStatus === "ACTIVE" ? "pause" : "activate";
    setStatusPendingId(metaCampaignId);
    startStatusTransition(async () => {
      try {
        const res = await fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/actions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action })
        });
        const j = await res.json();
        if (j.ok) {
          const next = action === "activate" ? "ACTIVE" : "PAUSED";
          setCampaigns((prev) =>
            prev.map((c) => (c.metaCampaignId === metaCampaignId ? { ...c, status: next } : c))
          );
        }
      } finally {
        setStatusPendingId(null);
      }
    });
  }

  function statusLabel(status?: string) {
    if (status === "ACTIVE") return tCampaigns("statusActive");
    if (status === "PAUSED") return tCampaigns("statusPaused");
    return tCampaigns("statusInactive");
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

  const [platform, setPlatform] = useState<"meta" | "google" | "both">("meta");
  const [googleAvailable, setGoogleAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/clients/${encodeURIComponent(clientId)}/google-ads`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (active && j?.ok && j.linkedCustomerId) {
          setGoogleAvailable(true);
          setPlatform("both");
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [clientId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <DsPageHeader
        breadcrumbs={
          <Link href="/clients" className="ui-link">
            ← {t("breadcrumb")}
          </Link>
        }
        title={name || t("client")}
      />

      <ClientDetailTabs clientSlug={clientId} activeTab="overview" />

      {googleAvailable ? (
        <div className="flex items-center gap-1.5">
          {(["meta", "google", "both"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                platform === p
                  ? "border-transparent bg-[var(--ui-accent)] text-white"
                  : "border-[var(--border-color)] text-[var(--text-dim)]"
              }`}
            >
              {p !== "google" ? <MetaGlyph /> : null}
              {p !== "meta" ? <GoogleGlyph /> : null}
              {t(`platform_${p}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      ) : null}

      {platform !== "google" ? (
        <>
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
            className="ui-link text-xs font-semibold"
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
                      ? "cursor-not-allowed border-[var(--border-color)] text-[var(--text-dimmer)]"
                      : "border-[var(--border-color)] text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
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

        {chartData.length >= 1 ? (
          <ChartContainer height="h-56" className="mt-4">
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
          </ChartContainer>
        ) : (
          <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] text-xs text-[var(--text-dim)]">
            {t("noChartData")}
          </div>
        )}
      </div>

      {/* Campanhas ativas */}
      <div className="ui-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--text-main)]">{t("campaignsTitle")}</div>
          <CampaignTableColumnsButton />
        </div>
        {loading ? (
          <TableSkeleton bare rows={4} columns={["media", "badge", "select", "wide"]} />
        ) : campaigns.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-dim)]">{t("noCampaigns")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[var(--surface-thead)] text-xs font-semibold uppercase text-[var(--text-dim)]">
                <tr>
                  <th className={`whitespace-nowrap ${STICKY_STATUS_TH}`}>{t("colStatus")}</th>
                  <th className={`whitespace-nowrap ${STICKY_NAME_TH}`}>{t("colCampaign")}</th>
                  <th className="whitespace-nowrap px-3 py-2 text-center">{tPresets("label")}</th>
                  <CampaignTableHead
                    columns={metricColumns}
                    customMetricNames={customMetricNames}
                  />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const preset = presets[c.metaCampaignId] ?? c.preset ?? "default";
                  return (
                    <tr
                      key={c.metaCampaignId}
                      className="group border-t border-[var(--border-color)] hover:bg-[var(--row-hover)]"
                    >
                      <td className={STICKY_STATUS_TD}>
                        <CampaignStatusToggle
                          active={c.status === "ACTIVE"}
                          disabled={statusPendingId === c.metaCampaignId}
                          ariaLabel={statusLabel(c.status)}
                          onChange={() => toggleCampaignStatus(c.metaCampaignId, c.status)}
                        />
                      </td>
                      <td className={STICKY_NAME_TD}>
                        <Link
                          href={`/campaigns/${c.metaCampaignId}?client=${encodeURIComponent(c.clientSlug || clientId)}`}
                          className="ui-link block w-full whitespace-normal break-words text-left font-medium"
                        >
                          {c.campaignName}
                        </Link>
                      </td>
                      <td className="relative px-3 py-2.5 text-center">
                        <CampaignTypeSelectCompact
                          value={preset}
                          customTypes={customTypes}
                          onChange={(p) => changePreset(c.metaCampaignId, p)}
                        />
                      </td>
                      {metricColumns.map((col) => (
                        <CampaignTableCell
                          key={columnRefKey(col)}
                          col={col}
                          row={c}
                          customMetrics={tableLayout.customMetricsMap}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-[var(--border-color)] bg-[var(--surface-thead)]/80">
                <tr>
                  <td className={`${STICKY_STATUS_TF} text-[var(--text-dimmer)]`}>—</td>
                  <td className={STICKY_NAME_TF}>
                    {tCampaigns("rowTotal")} ({campaigns.length})
                  </td>
                  <td className="px-3 py-2.5 text-center text-[var(--text-dimmer)]">—</td>
                  {metricColumns.map((col) => {
                    const key = columnRefKey(col);
                    const val = campaignTotals[key];
                    let content = "—";
                    if (val != null && col.kind === "metric") {
                      content = formatMetricValue(col.key, val, locale);
                    } else if (val != null && col.kind === "custom") {
                      const fmt = tableLayout.customMetricsMap[col.id]?.format ?? "number";
                      if (fmt === "currency") content = formatBRL(val, locale);
                      else if (fmt === "percent") content = formatPercent(val, 2, locale);
                      else if (fmt === "multiplier") content = formatRoas(val, locale);
                      else content = String(Math.round(val * 100) / 100);
                    } else if (val != null) {
                      content = String(val);
                    }
                    return (
                      <td
                        key={key}
                        className="px-3 py-2.5 text-center font-semibold tabular-nums text-[var(--text-main)]"
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
        </>
      ) : null}

      {platform !== "meta" && googleAvailable ? (
        <ClientGoogleAdsPanel clientId={clientId} />
      ) : null}

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

function MetaGlyph() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#0866FF"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.4 14.5 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z"
      />
    </svg>
  );
}
