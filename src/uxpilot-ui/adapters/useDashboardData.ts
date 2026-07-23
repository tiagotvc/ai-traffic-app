"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import type { LearningDto } from "@/lib/agency-brain/types";
import { buildDashboardPeriodContext } from "@/lib/dashboard/period-context";
import {
  DEFAULT_DASHBOARD_CHART_METRICS,
  DEFAULT_DASHBOARD_CLIENT_METRIC,
  MAX_CHART_METRICS,
  METRIC_BY_KEY,
  formatMetricValue,
  type MetricKey
} from "@/lib/dashboard-metrics";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DASHBOARD_CHART_METRICS_STORAGE_KEY,
  normalizeChartMetrics,
  type DashboardLayoutPrefs
} from "@/lib/dashboard-layout-prefs";
import { buildQuery, resolveRanges } from "@/lib/dashboard-ranges";
import { DEFAULT_REPORT_TZ } from "@/lib/report-period";
import type { AgeBreakdownRow } from "@/lib/dashboard-age-breakdown";
import type { DashboardAdLibraryInsights } from "@/uxpilot-ui/adapters/dashboard-mappers";

type Summary = Partial<Record<MetricKey, number>>;
type SeriesPoint = { day: string } & Partial<Record<MetricKey, number>>;

type VariationLite = {
  id: string;
  metric: MetricKey;
  deltaPct: number;
  direction: "up" | "down";
  severity: "critical" | "warning" | "positive";
  entityName: string | null;
};

type AlertItem = {
  id: string;
  title: string;
  description: string;
};

type ClientCard = {
  id: string;
  slug: string;
  name: string;
  roas: number;
  dominantPreset?: string;
  metrics?: Partial<Record<MetricKey, number>>;
  alertCount?: number;
};

type CampaignSnapshot = {
  metaCampaignId: string;
  campaignName: string;
  clientName?: string;
  preset?: string;
  spend?: number;
  roas?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  messages?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpa?: number | null;
  cpmsg?: number;
  status?: string;
  isDraft?: boolean;
};

const EMPTY_PERIOD: PeriodState = { preset: "last30", since: "", until: "" };

function readCachedChartMetrics(): MetricKey[] | null {
  try {
    const raw =
      localStorage.getItem(DASHBOARD_CHART_METRICS_STORAGE_KEY) ??
      localStorage.getItem("orion-highlights-chart-metrics");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeChartMetrics(parsed);
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

function writeCachedChartMetrics(metrics: MetricKey[]) {
  try {
    localStorage.setItem(DASHBOARD_CHART_METRICS_STORAGE_KEY, JSON.stringify(normalizeChartMetrics(metrics)));
  } catch {
    /* ignore */
  }
}

type AdAccountOpt = {
  id: string;
  metaAdAccountId: string;
  label: string;
  timezone?: string | null;
};

function accountsKey(accounts: AdAccountOpt[]) {
  return accounts.map((a) => `${a.id}:${a.label}`).join("|");
}

function normalizeDashboardSummary(raw: unknown): Summary {
  if (!raw || typeof raw !== "object") return {};
  const out: Summary = {};
  for (const key of Object.keys(METRIC_BY_KEY) as MetricKey[]) {
    const n = Number((raw as Record<string, unknown>)[key]);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

function extractDashboardSummary(json: Record<string, unknown> | null | undefined): Summary | null {
  if (!json || json.ok === false) return null;
  const normalized = normalizeDashboardSummary(json.summary);
  return Object.keys(normalized).length ? normalized : null;
}

function resolveSummaryFromJson(json: Record<string, unknown>): Summary | null {
  const normalized = extractDashboardSummary(json) ?? normalizeDashboardSummary(json.summary);
  return Object.keys(normalized).length ? normalized : null;
}

function accountTimezone(accounts: AdAccountOpt[], accountFilter: string): string | undefined {
  if (!accountFilter) return undefined;
  const match = accounts.find(
    (a) => a.id === accountFilter || a.metaAdAccountId === accountFilter
  );
  return match?.timezone || undefined;
}

export function useDashboardData() {
  const t = useTranslations("dashboard");
  const tPeriod = useTranslations("period");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const strip = useCommandStripOptional();
  const setAdAccountsRef = useRef(strip?.setAdAccounts);
  setAdAccountsRef.current = strip?.setAdAccounts;
  const setIsEmptyStateRef = useRef(strip?.setIsEmptyState);
  setIsEmptyStateRef.current = strip?.setIsEmptyState;
  const tRef = useRef(t);
  tRef.current = t;

  const clientFilter = strip?.clientFilter ?? "";
  const accountFilter = strip?.accountFilter ?? "";
  const stripPeriod = strip?.period;
  const period = useMemo(
    () => stripPeriod ?? EMPTY_PERIOD,
    [stripPeriod?.preset, stripPeriod?.since, stripPeriod?.until]
  );
  const periodRef = useRef(period);
  periodRef.current = period;
  const periodKey = `${period.preset}|${period.since}|${period.until}`;

  const [userChartMetrics, setUserChartMetrics] = useState<MetricKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_DASHBOARD_CHART_METRICS;
    return readCachedChartMetrics() ?? DEFAULT_DASHBOARD_CHART_METRICS;
  });
  const [chartMetrics, setChartMetrics] = useState<MetricKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_DASHBOARD_CHART_METRICS;
    return readCachedChartMetrics() ?? DEFAULT_DASHBOARD_CHART_METRICS;
  });
  const [clientMetric, setClientMetric] = useState<MetricKey>(DEFAULT_DASHBOARD_CLIENT_METRIC);
  const [userClientMetric, setUserClientMetric] = useState<MetricKey>(DEFAULT_DASHBOARD_CLIENT_METRIC);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayoutPrefs>(DEFAULT_DASHBOARD_LAYOUT);
  const prefsHydratedRef = useRef(false);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [variations, setVariations] = useState<VariationLite[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<AlertItem[]>([]);
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccountOpt[]>([]);
  const adAccountsRef = useRef(adAccounts);
  adAccountsRef.current = adAccounts;
  const contextAccountsKeyRef = useRef("");
  const [brainLearnings, setBrainLearnings] = useState<
    Array<LearningDto & { clientName?: string; clientSlug?: string }>
  >([]);
  const [brainLearningsLoading, setBrainLearningsLoading] = useState(true);
  const [brainLearningsCount, setBrainLearningsCount] = useState(0);
  const [brainHypothesesCount, setBrainHypothesesCount] = useState(0);
  const [brainSummaryLoading, setBrainSummaryLoading] = useState(true);
  const [ageBreakdown, setAgeBreakdown] = useState<AgeBreakdownRow[]>([]);
  const [ageBreakdownLoading, setAgeBreakdownLoading] = useState(true);
  const [campaignSnapshots, setCampaignSnapshots] = useState<CampaignSnapshot[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [adLibraryInsights, setAdLibraryInsights] = useState<DashboardAdLibraryInsights | null>(null);
  const [adLibraryLoading, setAdLibraryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [metaConnectionLoading, setMetaConnectionLoading] = useState(true);
  const [metaConnected, setMetaConnected] = useState(false);
  const [platform, setPlatform] = useState<"meta" | "google" | "both">("both");
  const [note, setNote] = useState<string | null>(null);

  const selectedTz = useMemo(() => {
    if (!accountFilter) return undefined;
    return accountTimezone(adAccounts, accountFilter);
  }, [accountFilter, adAccounts]);

  const activeTz = selectedTz ?? DEFAULT_REPORT_TZ;

  const load = useCallback(async () => {
    const currentPeriod = periodRef.current;
    const tz = accountTimezone(adAccountsRef.current, accountFilter);

    setLoading(true);
    try {
      const { current, previous } = resolveRanges(currentPeriod, tz);
      const platformQ = platform !== "both" ? `&platform=${platform}` : "";
      const curQ = buildQuery(clientFilter, accountFilter, current);
      const prevQ = previous ? buildQuery(clientFilter, accountFilter, previous) : null;

      const [sRes, tRes, pRes] = await Promise.all([
        fetch(`/api/dashboard/summary?${curQ}${platformQ}`),
        fetch(`/api/dashboard/timeseries?${curQ}${platformQ}`),
        prevQ ? fetch(`/api/dashboard/summary?${prevQ}${platformQ}`) : Promise.resolve(null)
      ]);

      const parseJson = async (res: Response) => {
        const text = await res.text();
        try {
          return JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new Error(res.status === 504 ? "timeout" : "parse");
        }
      };

      const sJson = await parseJson(sRes);
      const tJson = await parseJson(tRes);

      let nextPrevSummary: Summary | null = null;
      if (pRes) {
        try {
          const pJson = await parseJson(pRes);
          nextPrevSummary = resolveSummaryFromJson(pJson);
        } catch {
          nextPrevSummary = null;
        }
      }

      const nextSummary = resolveSummaryFromJson(sJson) ?? {};
      const nextAccounts = (sJson.adAccounts as AdAccountOpt[]) ?? [];

      setSummary(nextSummary);
      setPrevSummary(nextPrevSummary);
      setSeries((tJson.series as SeriesPoint[]) ?? []);
      setAdAccounts(nextAccounts);

      const nextKey = accountsKey(nextAccounts);
      if (nextKey !== contextAccountsKeyRef.current) {
        contextAccountsKeyRef.current = nextKey;
        setAdAccountsRef.current?.(nextAccounts.map((a) => ({ id: a.id, label: a.label })));
      }

      setNote(null);
    } catch {
      setNote(tRef.current("loadError"));
    } finally {
      setLoading(false);
    }

    const { current } = resolveRanges(currentPeriod, tz);
    const varDays = current
      ? Math.min(
          90,
          Math.max(1, Math.round((Date.parse(current.until) - Date.parse(current.since)) / 86_400_000) + 1)
        )
      : 90;

    void Promise.all([
      fetch(
        `/api/alerts/variations?level=client&days=${varDays}${
          clientFilter ? `&clientId=${encodeURIComponent(clientFilter)}` : ""
        }`
      )
        .then((r) => r.json())
        .then((j) => setVariations(j.items ?? []))
        .catch(() => {}),
      fetch("/api/alerts?severity=critical&limit=8")
        .then((r) => r.json())
        .then((j) => setCriticalAlerts(j.alerts ?? []))
        .catch(() => {})
    ]);
  }, [clientFilter, accountFilter, periodKey, platform]);

  const loadClients = useCallback(() => {
    const qs = periodStateToQuery(periodRef.current).toString();
    const timer = window.setTimeout(() => {
      fetch(`/api/clients/cards?${qs}`)
        .then(async (r) => {
          const text = await r.text();
          try {
            return JSON.parse(text) as { clients?: ClientCard[] };
          } catch {
            return { clients: [] as ClientCard[] };
          }
        })
        .then((j) => setClients(j.clients ?? []))
        .catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [periodKey]);

  const loadBrainLearnings = useCallback(() => {
    setBrainLearningsLoading(true);
    setBrainSummaryLoading(true);

    const parseItems = (j: { ok?: boolean; items?: LearningDto[] }) =>
      j.ok && Array.isArray(j.items) ? j.items : [];

    const finish = (items: Array<LearningDto & { clientName?: string; clientSlug?: string }>) => {
      setBrainLearnings(items.slice(0, 4));
      setBrainLearningsLoading(false);
    };

    void fetch("/api/dashboard/brain-summary")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setBrainLearningsCount(Number(j.learningsCount) || 0);
          setBrainHypothesesCount(Number(j.hypothesesCount) || 0);
        }
      })
      .catch(() => {})
      .finally(() => setBrainSummaryLoading(false));

    if (clientFilter) {
      void fetch(
        `/api/clients/${encodeURIComponent(clientFilter)}/learnings?pageSize=8&sortBy=updatedAt&sortDir=desc`
      )
        .then((r) => r.json())
        .then((j) =>
          finish(
            parseItems(j).filter((l) => l.status !== "REJECTED" && l.status !== "ARCHIVED")
          )
        )
        .catch(() => finish([]));
      return;
    }

    void fetch("/api/dashboard/brain-shelf?pageSize=8")
      .then((r) => r.json())
      .then((j) => finish(parseItems(j) as Array<LearningDto & { clientName?: string; clientSlug?: string }>))
      .catch(() => finish([]));
  }, [clientFilter]);

  const loadAgeBreakdown = useCallback(() => {
    setAgeBreakdownLoading(true);
    const { current } = resolveRanges(periodRef.current, selectedTz);
    const curQ = buildQuery(clientFilter, accountFilter, current);
    void fetch(`/api/dashboard/age-breakdown?${curQ}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.rows)) {
          setAgeBreakdown(j.rows as AgeBreakdownRow[]);
        } else {
          setAgeBreakdown([]);
        }
      })
      .catch(() => setAgeBreakdown([]))
      .finally(() => setAgeBreakdownLoading(false));
  }, [clientFilter, accountFilter, periodKey, selectedTz]);

  const loadCampaignSnapshots = useCallback(() => {
    setCampaignsLoading(true);
    const params = new URLSearchParams(periodStateToQuery(periodRef.current));
    params.set("limit", "200");
    params.set("offset", "0");
    if (clientFilter) params.set("clientId", clientFilter);

    void fetch(`/api/campaigns/list?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok || !Array.isArray(j.rows)) {
          setCampaignSnapshots([]);
          return;
        }
        setCampaignSnapshots(
          j.rows.map(
            (row: {
              metaCampaignId?: string;
              campaignName?: string;
              clientName?: string;
              preset?: string;
              spend?: number;
              roas?: number;
              impressions?: number;
              clicks?: number;
              conversions?: number;
              messages?: number;
              ctr?: number;
              cpc?: number;
              cpm?: number;
              cpa?: number | null;
              cpmsg?: number;
              status?: string;
              isDraft?: boolean;
            }) => ({
              metaCampaignId: String(row.metaCampaignId ?? row.campaignName ?? Math.random()),
              campaignName: row.campaignName ?? "—",
              clientName: row.clientName,
              preset: row.preset ?? "default",
              spend: row.spend,
              roas: row.roas,
              impressions: row.impressions,
              clicks: row.clicks,
              conversions: row.conversions,
              messages: row.messages,
              ctr: row.ctr,
              cpc: row.cpc,
              cpm: row.cpm,
              cpa: row.cpa,
              cpmsg: row.cpmsg,
              status: row.status,
              isDraft: Boolean(row.isDraft)
            })
          )
        );
      })
      .catch(() => setCampaignSnapshots([]))
      .finally(() => setCampaignsLoading(false));
  }, [clientFilter, periodKey]);

  const loadAdLibraryInsights = useCallback(() => {
    setAdLibraryLoading(true);
    const params = new URLSearchParams();
    if (clientFilter) params.set("clientId", clientFilter);

    void fetch(`/api/dashboard/ad-library-insights?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setAdLibraryInsights(j as DashboardAdLibraryInsights);
        } else {
          setAdLibraryInsights(null);
        }
      })
      .catch(() => setAdLibraryInsights(null))
      .finally(() => setAdLibraryLoading(false));
  }, [clientFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/settings/meta")
      .then((r) => r.json())
      .then((j) => {
        if (mounted) setMetaConnected(Boolean(j.ok && j.workspaceConnected));
      })
      .catch(() => {
        if (mounted) setMetaConnected(false);
      })
      .finally(() => {
        if (mounted) setMetaConnectionLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadAgeBreakdown();
  }, [loadAgeBreakdown]);

  useEffect(() => {
    loadCampaignSnapshots();
  }, [loadCampaignSnapshots]);

  useEffect(() => {
    loadAdLibraryInsights();
  }, [loadAdLibraryInsights]);

  useEffect(() => {
    return loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadBrainLearnings();
  }, [loadBrainLearnings]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/settings/dashboard-prefs")
      .then((r) => r.json())
      .then((j) => {
        if (!mounted || !j.ok) return;
        if (Array.isArray(j.dashboardChartMetrics)) {
          const metrics = normalizeChartMetrics(j.dashboardChartMetrics);
          setUserChartMetrics(metrics);
          writeCachedChartMetrics(metrics);
          if (!clientFilter) setChartMetrics(metrics);
        }
        prefsHydratedRef.current = true;
        if (typeof j.dashboardClientMetric === "string" && j.dashboardClientMetric in METRIC_BY_KEY) {
          const metric = j.dashboardClientMetric as MetricKey;
          setUserClientMetric(metric);
          if (!clientFilter) setClientMetric(metric);
        }
        if (j.dashboardLayout && typeof j.dashboardLayout === "object") {
          setDashboardLayout(j.dashboardLayout as DashboardLayoutPrefs);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [clientFilter]);

  useEffect(() => {
    let mounted = true;
    if (!clientFilter) {
      if (prefsHydratedRef.current) {
        setChartMetrics(userChartMetrics);
        setClientMetric(userClientMetric);
      }
      return () => {
        mounted = false;
      };
    }
    fetch(`/api/clients/${encodeURIComponent(clientFilter)}/meta-settings`)
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        const s = j.settings;
        if (s) {
          if (Array.isArray(s.defaultDashboardMetrics) && s.defaultDashboardMetrics.length) {
            const metrics = normalizeChartMetrics(s.defaultDashboardMetrics);
            setChartMetrics(metrics);
            writeCachedChartMetrics(metrics);
          }
          if (s.defaultClientMetric) setClientMetric(s.defaultClientMetric as MetricKey);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [clientFilter, userChartMetrics, userClientMetric]);

  useEffect(() => {
    const onSync = () => {
      void load();
      loadClients();
      loadBrainLearnings();
      loadAgeBreakdown();
      loadCampaignSnapshots();
      loadAdLibraryInsights();
    };
    window.addEventListener("traffic-sync-done", onSync);
    return () => window.removeEventListener("traffic-sync-done", onSync);
  }, [load, loadClients, loadBrainLearnings, loadAgeBreakdown, loadCampaignSnapshots, loadAdLibraryInsights]);

  const persistChartMetrics = useCallback(
    (next: MetricKey[]) => {
      writeCachedChartMetrics(next);
      if (clientFilter) {
        void fetch(`/api/clients/${encodeURIComponent(clientFilter)}/meta-settings`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ defaultDashboardMetrics: next })
        });
        return;
      }
      setUserChartMetrics(next);
      void fetch("/api/settings/dashboard-prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dashboardChartMetrics: next })
      });
    },
    [clientFilter]
  );

  const persistDashboardCustomization = useCallback(
    async (next: { layout: DashboardLayoutPrefs; chartMetrics: MetricKey[] }): Promise<void> => {
      // Aplicação otimista…
      setDashboardLayout(next.layout);
      setChartMetrics(next.chartMetrics);
      writeCachedChartMetrics(next.chartMetrics);
      if (!clientFilter) setUserChartMetrics(next.chartMetrics);

      try {
        const res = await fetch("/api/settings/dashboard-prefs", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            dashboardLayout: next.layout,
            ...(clientFilter ? {} : { dashboardChartMetrics: next.chartMetrics })
          })
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (!res.ok || !json?.ok) throw new Error(`PATCH dashboard-prefs ${res.status}`);

        if (clientFilter) {
          void fetch(`/api/clients/${encodeURIComponent(clientFilter)}/meta-settings`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ defaultDashboardMetrics: next.chartMetrics })
          });
        }
      } catch (err) {
        // …mas nunca mentimos: se o servidor não gravou, ressincroniza com o que ele tem
        // (antes, o fire-and-forget deixava a UI "salva" e o reload revertia tudo).
        console.error("[dashboard] falha ao salvar personalização — restaurando do servidor", err);
        try {
          const r = await fetch("/api/settings/dashboard-prefs");
          const j = (await r.json().catch(() => null)) as {
            ok?: boolean;
            dashboardLayout?: DashboardLayoutPrefs;
            dashboardChartMetrics?: string[];
          } | null;
          if (j?.ok) {
            if (j.dashboardLayout) setDashboardLayout(j.dashboardLayout);
            if (Array.isArray(j.dashboardChartMetrics)) {
              const metrics = normalizeChartMetrics(j.dashboardChartMetrics);
              setChartMetrics(metrics);
              writeCachedChartMetrics(metrics);
              if (!clientFilter) setUserChartMetrics(metrics);
            }
          }
        } catch {
          // sem rede — mantém o otimista; o próximo load resolve
        }
      }
    },
    [clientFilter]
  );

  const toggleChartMetric = useCallback(
    (key: MetricKey, options?: { scope?: MetricKey[] }) => {
      setChartMetrics((cur) => {
        const scope = options?.scope;
        const scoped = scope ? cur.filter((k) => scope.includes(k)) : cur;
        const outside = scope ? cur.filter((k) => !scope.includes(k)) : [];

        const nextScoped = scoped.includes(key)
          ? scoped.length > 1
            ? scoped.filter((k) => k !== key)
            : scoped
          : scoped.length >= MAX_CHART_METRICS
            ? scoped
            : [...scoped, key];

        const next = scope ? nextScoped : [...outside, ...nextScoped];
        if (next.join("|") !== cur.join("|")) persistChartMetrics(next);
        return next;
      });
    },
    [persistChartMetrics]
  );

  const dominantPreset = clientFilter
    ? clients.find((c) => c.slug === clientFilter)?.dominantPreset
    : undefined;

  const isEmptyState =
    !loading &&
    !metaConnectionLoading &&
    !metaConnected;

  const lastEmptyStateRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastEmptyStateRef.current === isEmptyState) return;
    lastEmptyStateRef.current = isEmptyState;
    setIsEmptyStateRef.current?.(isEmptyState);
  }, [isEmptyState]);

  const metricLabel = useCallback((key: MetricKey) => tMetrics(METRIC_BY_KEY[key].label), [tMetrics]);

  const chartMetricLabels = useMemo(() => {
    const labels = {} as Record<MetricKey, string>;
    for (const key of Object.keys(METRIC_BY_KEY) as MetricKey[]) {
      labels[key] = metricLabel(key);
    }
    return labels;
  }, [metricLabel]);

  const periodContext = useMemo(
    () =>
      buildDashboardPeriodContext({
        period,
        timeZone: activeTz,
        locale,
        tPeriod,
        tDash: t
      }),
    [period, activeTz, locale, tPeriod, t]
  );

  return {
    loading,
    metaConnectionLoading,
    metaConnected,
    platform,
    setPlatform,
    note,
    summary,
    prevSummary,
    series,
    variations,
    criticalAlerts,
    clients,
    brainLearnings,
    brainLearningsLoading,
    brainLearningsCount,
    brainHypothesesCount,
    brainSummaryLoading,
    ageBreakdown,
    ageBreakdownLoading,
    campaignSnapshots,
    campaignsLoading,
    adLibraryInsights,
    adLibraryLoading,
    chartMetrics,
    toggleChartMetric,
    dashboardLayout,
    persistDashboardCustomization,
    clientMetric,
    dominantPreset,
    isEmptyState,
    locale,
    activeTz,
    period,
    periodLabel: periodContext.periodLabel,
    metricLabel,
    chartMetricLabels,
    vsLabel: periodContext.vsLabel,
    deltaNewLabel: t("deltaNew"),
    chartSubtitle: periodContext.chartSubtitle,
    formatMetricValue: (key: MetricKey, value: number) => formatMetricValue(key, value, locale)
  };
}
