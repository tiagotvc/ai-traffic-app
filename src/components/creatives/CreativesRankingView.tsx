"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { CreativesAccessWarningBanner } from "@/components/creatives/CreativesAccessWarningBanner";
import { Badge } from "@/components/ui/Badge";
import { type MetricKey, METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
import type { CreativeAccessWarning } from "@/lib/creatives-access-types";
import type { AggregatedCreative } from "@/lib/agency-brain/creative-intelligence";
import type { RankConfig } from "@/lib/creative-ranking";
import { DEFAULT_RANK_CONFIG } from "@/lib/creative-ranking";
import {
  mergeCreativesIntoGroups,
  type CreativeRankGroup
} from "@/lib/creatives-ranking-merge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CreativeCardGrid, type CreativeItem } from "@/components/creatives/CreativeCardGrid";

type Group = CreativeRankGroup;

type AccountOpt = { metaAdAccountId: string; label: string };

const COST_METRICS = new Set<MetricKey>(["cpmsg", "cpa", "cpm", "cpc"]);

function parseAdAccountIdFromQuery(periodQuery: string): string | null {
  const params = new URLSearchParams(periodQuery);
  return params.get("adAccountId");
}

function stripRefreshFromQuery(periodQuery: string): string {
  const params = new URLSearchParams(periodQuery);
  params.delete("refresh");
  return params.toString();
}

export function CreativesRankingView({
  clientId,
  clientSlug,
  periodQuery = "",
  accounts = [],
  accountsLoading = false
}: {
  clientId: string;
  clientSlug?: string;
  periodQuery?: string;
  accounts?: AccountOpt[];
  accountsLoading?: boolean;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const [groups, setGroups] = useState<Group[]>([]);
  const [warnings, setWarnings] = useState<CreativeAccessWarning[]>([]);
  const [partialData, setPartialData] = useState(false);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [dataProvenance, setDataProvenance] = useState<{
    source?: string;
    fetchedAt?: string;
    cacheTtlSec?: number;
    cacheHits?: number;
    partialData?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAccounts, setPendingAccounts] = useState(0);
  const [expandedZero, setExpandedZero] = useState<Record<string, boolean>>({});
  const chunksRef = useRef<AggregatedCreative[][]>([]);
  const rankConfigRef = useRef<RankConfig>(DEFAULT_RANK_CONFIG);
  const loadGenRef = useRef(0);

  const applyResponseMeta = useCallback((j: Record<string, unknown>) => {
    if (j.warnings) setWarnings(j.warnings as CreativeAccessWarning[]);
    setPartialData(Boolean(j.partialData));
    setDataSource((j.dataSource as string) ?? null);
    setDataProvenance((j.dataProvenance as typeof dataProvenance) ?? null);
  }, []);

  const publishGroups = useCallback((rankConfig: RankConfig) => {
    const merged = mergeCreativesIntoGroups(chunksRef.current, rankConfig);
    setGroups(merged);
  }, []);

  const fetchPerformance = useCallback(
    async (extraQuery: string) => {
      const base = stripRefreshFromQuery(periodQuery);
      const q = [base, extraQuery].filter(Boolean).join("&");
      const res = await fetch(
        `/api/creatives/performance?clientId=${encodeURIComponent(clientId)}&${q}`
      );
      const j = await res.json();
      return { res, j };
    },
    [clientId, periodQuery]
  );

  const load = useCallback(async () => {
    if (!clientId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const filteredAccountId = parseAdAccountIdFromQuery(periodQuery);
    if (accountsLoading && !filteredAccountId) {
      setLoading(true);
      return;
    }

    const gen = ++loadGenRef.current;
    setLoading(true);
    setPendingAccounts(0);
    setGroups([]);
    setWarnings([]);
    chunksRef.current = [];

    try {
      const cfgRes = await fetch("/api/creatives/ranking-config");
      const cfgJson = await cfgRes.json();
      const rankConfig = (cfgJson.config ?? DEFAULT_RANK_CONFIG) as RankConfig;
      rankConfigRef.current = rankConfig;

      const filteredAccountId = parseAdAccountIdFromQuery(periodQuery);
      const accountIds =
        filteredAccountId != null
          ? [filteredAccountId]
          : accounts.length > 0
            ? accounts.map((a) => a.metaAdAccountId)
            : null;

      // Uma conta ou lista ainda não carregada: request único (comportamento anterior).
      if (!accountIds || accountIds.length <= 1) {
        const { j } = await fetchPerformance("");
        if (gen !== loadGenRef.current) return;
        if (j.ok) {
          setGroups(j.groups ?? []);
          applyResponseMeta(j);
        }
        return;
      }

      // Várias contas: cache primeiro, depois Meta por conta (UI atualiza a cada conta).
      const cachedChunks: AggregatedCreative[][] = [];
      const needsLive: string[] = [];

      await Promise.all(
        accountIds.map(async (id) => {
          const { res, j } = await fetchPerformance(`adAccountId=${encodeURIComponent(id)}&cacheOnly=1`);
          if (gen !== loadGenRef.current) return;
          if (j.ok && Array.isArray(j.creatives) && j.creatives.length) {
            cachedChunks.push(j.creatives as AggregatedCreative[]);
          }
          const partial = res.headers.get("X-Cache-Partial") === "1" || Number(j.cacheMisses ?? 0) > 0;
          if (partial || !j.ok) needsLive.push(id);
        })
      );

      if (gen !== loadGenRef.current) return;

      chunksRef.current = [...cachedChunks];
      if (chunksRef.current.length) {
        publishGroups(rankConfig);
        setLoading(false);
      }

      const liveQueue = [...new Set(needsLive)];
      if (!liveQueue.length) {
        if (!chunksRef.current.length) setGroups([]);
        setLoading(false);
        return;
      }

      setPendingAccounts(liveQueue.length);
      let remaining = liveQueue.length;

      await Promise.all(
        liveQueue.map(async (id) => {
          try {
            const { j } = await fetchPerformance(`adAccountId=${encodeURIComponent(id)}`);
            if (gen !== loadGenRef.current) return;
            if (j.ok && Array.isArray(j.creatives) && j.creatives.length) {
              chunksRef.current.push(j.creatives as AggregatedCreative[]);
              publishGroups(rankConfigRef.current);
              applyResponseMeta(j);
            }
          } finally {
            if (gen === loadGenRef.current) {
              remaining -= 1;
              setPendingAccounts(remaining);
            }
          }
        })
      );
    } catch {
      /* ignore */
    } finally {
      if (gen === loadGenRef.current) {
        setLoading(false);
        setPendingAccounts(0);
      }
    }
  }, [clientId, periodQuery, accounts, accountsLoading, fetchPerformance, applyResponseMeta, publishGroups]);

  useEffect(() => {
    void load();
  }, [load]);

  function rankHint(metric: MetricKey) {
    const dir = COST_METRICS.has(metric) ? t("rankLower") : t("rankHigher");
    return `${t("rankedBy")} ${tMetrics(METRIC_BY_KEY[metric].label)} (${dir})`;
  }

  const showInitialSkeleton = loading && !groups.length;

  if (showInitialSkeleton) {
    return (
      <div className="space-y-3">
        <p className="text-center text-sm text-slate-500">{t("loading")}</p>
        <TableSkeleton rows={5} columns={["media", "metric", "metric", "metric"]} />
      </div>
    );
  }

  function provenanceLabel() {
    if (!dataProvenance) return null;
    const src = dataProvenance.source ?? dataSource;
    if (src === "cached" || src === "mixed") {
      const fetchedAt = dataProvenance.fetchedAt
        ? new Date(dataProvenance.fetchedAt)
        : null;
      if (fetchedAt) {
        const mins = Math.max(0, Math.floor((Date.now() - fetchedAt.getTime()) / 60000));
        return t("dataProvenanceCached", { mins });
      }
      return t("dataCached");
    }
    if (src === "live") return t("dataProvenanceLive");
    return null;
  }

  const banner = (
    <>
      {pendingAccounts > 0 ? (
        <div className="flex justify-center">
          <Badge variant="brand">{t("loadingAccounts", { n: pendingAccounts })}</Badge>
        </div>
      ) : null}
      {provenanceLabel() ? (
        <div className="flex justify-end">
          <Badge variant="neutral">{provenanceLabel()}</Badge>
        </div>
      ) : dataSource === "cached" || dataSource === "mixed" ? (
        <div className="flex justify-end">
          <Badge variant="neutral">{t("dataCached")}</Badge>
        </div>
      ) : null}
      <CreativesAccessWarningBanner warnings={warnings} partialData={partialData} />
    </>
  );

  if (!groups.length && !loading) {
    return (
      <div className="space-y-4">
        {banner}
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {banner}
      {groups.map((g) => {
        const cols = presetMetricsFor(g.preset);
        const zeroOpen = expandedZero[g.preset];
        const totalCount = g.best.length + g.promising.length + g.noSpend.length;
        return (
          <div key={g.preset} className="ui-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  {tPresets(g.preset)}{" "}
                  <span className="font-normal text-slate-400">({totalCount})</span>
                </div>
                <div className="text-[11px] text-slate-400">{rankHint(g.primaryMetric)}</div>
              </div>
              <Badge variant="brand">{tPresets(g.preset)}</Badge>
            </div>

            {g.best.length ? (
              <CreativeCardGrid
                creatives={g.best as CreativeItem[]}
                metrics={cols}
                primaryMetric={g.primaryMetric}
                clientSlug={clientSlug ?? ""}
              />
            ) : null}

            {g.promising.length ? (
              <div className="border-t border-slate-100">
                <div className="flex items-start gap-2 bg-amber-50/60 px-4 py-2.5">
                  <span className="text-amber-600">✦</span>
                  <div>
                    <div className="text-xs font-semibold text-amber-800">{t("promisingTitle")}</div>
                    <div className="text-[11px] text-amber-700">{t("promisingDesc")}</div>
                  </div>
                </div>
                <CreativeCardGrid
                  creatives={g.promising as CreativeItem[]}
                  metrics={cols}
                  primaryMetric={g.primaryMetric}
                  clientSlug={clientSlug ?? ""}
                  showRank={false}
                />
              </div>
            ) : null}

            {g.noSpend.length ? (
              <div className="border-t border-slate-100">
                <div className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedZero((prev) => ({ ...prev, [g.preset]: !prev[g.preset] }))
                    }
                    className="text-xs font-medium text-violet-600 hover:underline"
                  >
                    {zeroOpen ? t("showLess") : t("showMoreZero", { n: g.noSpend.length })}
                  </button>
                </div>
                {zeroOpen ? (
                  <CreativeCardGrid
                    creatives={g.noSpend as CreativeItem[]}
                    metrics={cols}
                    primaryMetric={g.primaryMetric}
                    clientSlug={clientSlug ?? ""}
                    showRank={false}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {pendingAccounts > 0 ? (
        <div className="opacity-70">
          <TableSkeleton rows={2} columns={["media", "metric", "metric", "metric"]} />
        </div>
      ) : null}
    </div>
  );
}
