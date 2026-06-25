"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useParams, useSearchParams } from "next/navigation";

import { rememberCampaign } from "@/components/CampaignsListClient";
import { periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { useCampaignPeriod } from "@/hooks/useCampaignPeriod";
import {
  clearDrilldownCache,
  drilldownCacheKey,
  isDrilldownCacheValid,
  readDrilldownCache,
  shouldUseLiveFetch,
  writeDrilldownCache,
  type DrilldownCacheEntry,
  type DrilldownCounts
} from "@/lib/campaign-drilldown-cache";
import type { MetricKey } from "@/lib/dashboard-metrics";

export type CampaignDrilldownContextValue = {
  metaCampaignId: string;
  clientSlug: string;
  period: PeriodState;
  setPeriod: (next: PeriodState) => void;
  campaign: DrilldownCacheEntry["campaign"];
  adsets: DrilldownCacheEntry["adsets"];
  ads: DrilldownCacheEntry["ads"];
  creatives: DrilldownCacheEntry["creatives"];
  creativesPreset: string;
  creativesPrimaryMetric: string;
  series: DrilldownCacheEntry["series"];
  previous: Partial<Record<MetricKey, number>> | null;
  preset: string;
  counts: DrilldownCounts;
  loading: boolean;
  refreshing: boolean;
  countsLoading: boolean;
  ensureLoaded: (opts?: { force?: boolean; live?: boolean }) => Promise<void>;
  refresh: (opts?: { live?: boolean }) => Promise<void>;
  invalidate: () => void;
};

const CampaignDrilldownContext = createContext<CampaignDrilldownContextValue | null>(null);

function buildApiQuery(
  period: PeriodState,
  clientSlug: string,
  live: boolean,
  extra?: Record<string, string>
) {
  const params = new URLSearchParams(periodStateToQuery(period));
  if (clientSlug) params.set("client", clientSlug);
  if (live) params.set("live", "1");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const EMPTY_COUNTS: DrilldownCounts = { adsets: 0, ads: 0, creatives: 0 };

export function CampaignDrilldownProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const metaCampaignId = String(params.metaCampaignId ?? "");
  const clientSlug = searchParams.get("client")?.trim() ?? "";
  const { period, setPeriod } = useCampaignPeriod();

  const cacheKey = useMemo(
    () => drilldownCacheKey(metaCampaignId, clientSlug, period),
    [metaCampaignId, clientSlug, period]
  );

  const memoryRef = useRef<Map<string, DrilldownCacheEntry>>(new Map());
  const inflightRef = useRef<Promise<void> | null>(null);
  const prevCacheKeyRef = useRef<string | null>(null);

  const [entry, setEntry] = useState<DrilldownCacheEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countsLoading, setCountsLoading] = useState(true);

  const hydrateFromCache = useCallback(
    (key: string): DrilldownCacheEntry | null => {
      const mem = memoryRef.current.get(key);
      if (isDrilldownCacheValid(mem ?? null)) return mem!;
      const stored = readDrilldownCache(key);
      if (stored) {
        memoryRef.current.set(key, stored);
        return stored;
      }
      return null;
    },
    []
  );

  const fetchAll = useCallback(
    async (opts?: { live?: boolean; force?: boolean }) => {
      if (!metaCampaignId) return;

      const key = drilldownCacheKey(metaCampaignId, clientSlug, period);
      if (!opts?.force && !opts?.live) {
        const cached = hydrateFromCache(key);
        if (cached) {
          setEntry(cached);
          setLoading(false);
          setRefreshing(false);
          setCountsLoading(false);
          return;
        }
      }

      const live = shouldUseLiveFetch(period, opts?.live ?? opts?.force);
      const qs = buildApiQuery(period, clientSlug, live);

      const detailPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}${qs}`).then(
        (r) => r.json()
      );
      const adsetsPromise = fetch(
        `/api/campaigns/${encodeURIComponent(metaCampaignId)}/adsets${qs}`
      ).then((r) => r.json());
      const adsPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/ads${qs}`).then(
        (r) => r.json()
      );
      const timeseriesPromise = fetch(
        `/api/campaigns/${encodeURIComponent(metaCampaignId)}/timeseries${qs}`
      ).then((r) => r.json());
      const creativesParams = new URLSearchParams(periodStateToQuery(period));
      if (clientSlug) creativesParams.set("clientSlug", clientSlug);
      if (live) creativesParams.set("live", "1");
      const creativesQs = creativesParams.toString() ? `?${creativesParams.toString()}` : "";
      const creativesPromise = fetch(
        `/api/campaigns/${encodeURIComponent(metaCampaignId)}/creatives${creativesQs}`
      ).then((r) => r.json());

      const [detailJ, adsetsJ, adsJ, timeseriesJ, creativesJ] = await Promise.all([
        detailPromise,
        adsetsPromise,
        adsPromise,
        timeseriesPromise,
        creativesPromise
      ]);

      if (detailJ.campaign) {
        rememberCampaign(metaCampaignId, detailJ.campaign.clientSlug || clientSlug);
      }

      const creativesRows = creativesJ.ok ? (creativesJ.rows ?? []) : [];
      const next: DrilldownCacheEntry = {
        campaign: detailJ.campaign ?? null,
        adsets: adsetsJ.adsets ?? [],
        ads: adsJ.ads ?? [],
        creatives: creativesRows,
        creativesPreset: creativesJ.preset ?? "default",
        creativesPrimaryMetric: creativesJ.primaryMetric ?? "ctr",
        series: timeseriesJ.series ?? [],
        previous: timeseriesJ.previous ?? null,
        preset: adsetsJ.preset ?? "default",
        counts: {
          adsets: (adsetsJ.adsets ?? []).length,
          ads: adsJ.total ?? (adsJ.ads ?? []).length,
          creatives: creativesJ.total ?? creativesRows.length
        },
        fetchedAt: Date.now(),
        live
      };

      memoryRef.current.set(key, next);
      writeDrilldownCache(key, next);
      setEntry(next);
      setLoading(false);
      setRefreshing(false);
      setCountsLoading(false);
    },
    [metaCampaignId, clientSlug, period, hydrateFromCache]
  );

  const ensureLoaded = useCallback(
    async (opts?: { force?: boolean; live?: boolean }) => {
      if (inflightRef.current && !opts?.force) {
        await inflightRef.current;
        return;
      }
      const key = drilldownCacheKey(metaCampaignId, clientSlug, period);
      if (!opts?.force && !opts?.live) {
        const cached = hydrateFromCache(key);
        if (cached) {
          setEntry(cached);
          setLoading(false);
          setCountsLoading(false);
          return;
        }
      }

      setLoading((prev) => (opts?.force ? prev : true));
      setCountsLoading(true);
      if (opts?.force) setRefreshing(true);

      const run = fetchAll(opts).finally(() => {
        inflightRef.current = null;
      });
      inflightRef.current = run;
      await run;
    },
    [metaCampaignId, clientSlug, period, hydrateFromCache, fetchAll]
  );

  const refresh = useCallback(
    async (opts?: { live?: boolean }) => {
      setRefreshing(true);
      await fetchAll({ force: true, live: opts?.live ?? true });
    },
    [fetchAll]
  );

  const invalidate = useCallback(() => {
    const key = drilldownCacheKey(metaCampaignId, clientSlug, period);
    memoryRef.current.delete(key);
    clearDrilldownCache(key);
    setEntry(null);
  }, [metaCampaignId, clientSlug, period]);

  useEffect(() => {
    const cached = hydrateFromCache(cacheKey);
    if (cached) {
      setEntry(cached);
      setLoading(false);
      setCountsLoading(false);
      prevCacheKeyRef.current = cacheKey;
      return;
    }
    prevCacheKeyRef.current = cacheKey;
    setLoading(true);
    setCountsLoading(true);
    void ensureLoaded({
      live: true
    });
  }, [cacheKey, hydrateFromCache, ensureLoaded, metaCampaignId, clientSlug, period]);

  const value = useMemo<CampaignDrilldownContextValue>(
    () => ({
      metaCampaignId,
      clientSlug,
      period,
      setPeriod,
      campaign: entry?.campaign ?? null,
      adsets: entry?.adsets ?? [],
      ads: entry?.ads ?? [],
      creatives: entry?.creatives ?? [],
      creativesPreset: entry?.creativesPreset ?? "default",
      creativesPrimaryMetric: entry?.creativesPrimaryMetric ?? "ctr",
      series: entry?.series ?? [],
      previous: entry?.previous ?? null,
      preset: entry?.preset ?? "default",
      counts: entry?.counts ?? EMPTY_COUNTS,
      loading,
      refreshing,
      countsLoading,
      ensureLoaded,
      refresh,
      invalidate
    }),
    [
      metaCampaignId,
      clientSlug,
      period,
      setPeriod,
      entry,
      loading,
      refreshing,
      countsLoading,
      ensureLoaded,
      refresh,
      invalidate
    ]
  );

  return (
    <CampaignDrilldownContext.Provider value={value}>{children}</CampaignDrilldownContext.Provider>
  );
}

export function useCampaignDrilldown(): CampaignDrilldownContextValue {
  const ctx = useContext(CampaignDrilldownContext);
  if (!ctx) {
    throw new Error("useCampaignDrilldown must be used within CampaignDrilldownProvider");
  }
  return ctx;
}

export function useCampaignDrilldownOptional(): CampaignDrilldownContextValue | null {
  return useContext(CampaignDrilldownContext);
}
