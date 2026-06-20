"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { CreativesAccessWarningBanner } from "@/components/creatives/CreativesAccessWarningBanner";
import { Badge } from "@/components/ui/Badge";
import { type MetricKey, METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
import type { CreativeAccessWarning } from "@/lib/creatives-access-types";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CreativeCardGrid, type CreativeItem } from "@/components/creatives/CreativeCardGrid";

type Group = {
  preset: string;
  primaryMetric: MetricKey;
  best: CreativeItem[];
  promising: CreativeItem[];
  noSpend: CreativeItem[];
};

const COST_METRICS = new Set<MetricKey>(["cpmsg", "cpa", "cpm", "cpc"]);

export function CreativesRankingView({
  clientId,
  clientSlug,
  periodQuery = "",
  accountsLoading = false
}: {
  clientId: string;
  clientSlug?: string;
  periodQuery?: string;
  accounts?: Array<{ metaAdAccountId: string; label: string }>;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedZero, setExpandedZero] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    if (!clientId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    if (accountsLoading) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setLoadError(null);
    fetch(`/api/creatives/performance?clientId=${encodeURIComponent(clientId)}&${periodQuery}`)
      .then(async (r) => {
        const text = await r.text();
        let j: Record<string, unknown> = {};
        try {
          j = JSON.parse(text) as Record<string, unknown>;
        } catch {
          if (!r.ok) {
            throw new Error(r.status === 504 ? t("errorTimeout") : t("errorLoad"));
          }
        }
        if (!r.ok) {
          throw new Error((j.error as string) || t("errorLoad"));
        }
        if (j.ok) {
          setGroups((j.groups as Group[]) ?? []);
          setWarnings((j.warnings as CreativeAccessWarning[]) ?? []);
          setPartialData(Boolean(j.partialData));
          setDataSource((j.dataSource as string) ?? r.headers.get("X-Data-Source"));
          setDataProvenance((j.dataProvenance as typeof dataProvenance) ?? null);
        }
      })
      .catch((e: Error) => {
        setLoadError(e.message || t("errorLoad"));
      })
      .finally(() => setLoading(false));
  }, [clientId, periodQuery, accountsLoading, t]);

  useEffect(() => {
    load();
  }, [load]);

  function rankHint(metric: MetricKey) {
    const dir = COST_METRICS.has(metric) ? t("rankLower") : t("rankHigher");
    return `${t("rankedBy")} ${tMetrics(METRIC_BY_KEY[metric].label)} (${dir})`;
  }

  if (loading && !groups.length) {
    return (
      <div className="space-y-3">
        <p className="text-center text-sm text-[var(--text-dim)]">{t("loading")}</p>
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

  if (loadError) {
    return (
      <div className="space-y-4">
        {banner}
        <div className="ui-card space-y-3 p-8 text-center">
          <p className="text-sm text-rose-600">{loadError}</p>
          <button type="button" onClick={load} className="ui-btn-secondary text-sm">
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="space-y-4">
        {banner}
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("empty")}</div>
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-main)]">
                  {tPresets(g.preset)}{" "}
                  <span className="font-normal text-[var(--text-dimmer)]">({totalCount})</span>
                </div>
                <div className="text-[11px] text-[var(--text-dimmer)]">{rankHint(g.primaryMetric)}</div>
              </div>
              <Badge variant="brand">{tPresets(g.preset)}</Badge>
            </div>

            {g.best.length ? (
              <CreativeCardGrid
                creatives={g.best}
                metrics={cols}
                primaryMetric={g.primaryMetric}
                clientSlug={clientSlug ?? ""}
              />
            ) : null}

            {g.promising.length ? (
              <div className="border-t border-[var(--border-color)]">
                <div className="flex items-start gap-2 bg-amber-50/60 px-4 py-2.5">
                  <span className="text-amber-600">✦</span>
                  <div>
                    <div className="text-xs font-semibold text-amber-800">{t("promisingTitle")}</div>
                    <div className="text-[11px] text-amber-700">{t("promisingDesc")}</div>
                  </div>
                </div>
                <CreativeCardGrid
                  creatives={g.promising}
                  metrics={cols}
                  primaryMetric={g.primaryMetric}
                  clientSlug={clientSlug ?? ""}
                  showRank={false}
                />
              </div>
            ) : null}

            {g.noSpend.length ? (
              <div className="border-t border-[var(--border-color)]">
                <div className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedZero((prev) => ({ ...prev, [g.preset]: !prev[g.preset] }))
                    }
                    className="text-xs font-medium text-[var(--violet)] hover:underline"
                  >
                    {zeroOpen ? t("showLess") : t("showMoreZero", { n: g.noSpend.length })}
                  </button>
                </div>
                {zeroOpen ? (
                  <CreativeCardGrid
                    creatives={g.noSpend}
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
    </div>
  );
}
