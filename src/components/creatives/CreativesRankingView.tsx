"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { CreativesAccessWarningBanner } from "@/components/creatives/CreativesAccessWarningBanner";
import { Badge } from "@/components/ui/Badge";
import { type MetricKey, METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
import type { CreativeAccessWarning } from "@/lib/creatives-access-types";
import { CreativeRankingCardsSkeleton } from "@/components/creatives/CreativeRankingCard";
import { CreativeCardGrid, type CreativeItem } from "@/components/creatives/CreativeCardGrid";

type Group = {
  preset: string;
  primaryMetric: MetricKey;
  best: CreativeItem[];
  promising: CreativeItem[];
  noSpend: CreativeItem[];
};

const COST_METRICS = new Set<MetricKey>(["cpmsg", "cpa", "cpm", "cpc"]);

/** Top N do ranking: melhores primeiro; completa com promissores se faltar volume mínimo de "melhor". */
function pickTopCreatives(group: Group, limit: number): CreativeItem[] {
  const picked = group.best.slice(0, limit);
  if (picked.length >= limit) return picked;
  const need = limit - picked.length;
  return [...picked, ...group.promising.slice(0, need)];
}

export function CreativesRankingView({
  clientId,
  clientSlug,
  periodQuery = "",
  adAccountId,
  maxBest,
  initialGroups,
  embedInReport = false,
  accountsLoading = false
}: {
  clientId: string;
  clientSlug?: string;
  periodQuery?: string;
  adAccountId?: string;
  /** When set, only show top N best creatives per group. */
  maxBest?: number;
  /** Embedded in report preview — same DS as main tab, compact best list. */
  embedInReport?: boolean;
  /** Server-rendered groups (PDF/Puppeteer) — skips client fetch. */
  initialGroups?: Group[];
  accounts?: Array<{ metaAdAccountId: string; label: string }>;
  accountsLoading?: boolean;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const [groups, setGroups] = useState<Group[]>(initialGroups ?? []);
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
  const [loading, setLoading] = useState(initialGroups === undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedZero, setExpandedZero] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    if (initialGroups !== undefined) {
      setGroups(initialGroups);
      setLoading(false);
      return;
    }
    if (accountsLoading && clientId) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams(periodQuery);
    if (clientId) params.set("clientId", clientId);
    if (adAccountId) params.set("adAccountId", adAccountId);
    fetch(`/api/creatives/performance?${params.toString()}`)
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
  }, [clientId, periodQuery, adAccountId, accountsLoading, initialGroups, t]);

  useEffect(() => {
    load();
  }, [load]);

  function rankHint(metric: MetricKey) {
    const dir = COST_METRICS.has(metric) ? t("rankLower") : t("rankHigher");
    return `${t("rankedBy")} ${tMetrics(METRIC_BY_KEY[metric].label)} (${dir})`;
  }

  if (loading && !groups.length) {
    return (
      <div className="space-y-3" data-report-creatives-loading="true">
        <CreativeRankingCardsSkeleton count={3} compact={embedInReport} />
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
      <div className="space-y-4" data-report-creatives-ready="true">
        {banner}
        <div className="campaign-creator-card space-y-3 p-6 text-center">
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
      <div className="space-y-4" data-report-creatives-ready="true">
        {banner}
        <div className="campaign-creator-card p-6 text-center text-sm text-[var(--text-dim)]">{t("empty")}</div>
      </div>
    );
  }

  return (
    <div className={embedInReport ? "space-y-3" : "space-y-5"} data-report-creatives-ready="true">
      {!embedInReport ? banner : null}
      {groups.map((g) => {
        const cols = presetMetricsFor(g.preset);
        const best = maxBest != null ? pickTopCreatives(g, maxBest) : g.best;
        const zeroOpen = expandedZero[g.preset];
        const compactBest = maxBest != null;
        const totalCount = compactBest ? best.length : g.best.length + g.promising.length + g.noSpend.length;
        return (
          <div key={g.preset} className="campaign-creator-card overflow-hidden p-0">
            <div
              className={`flex flex-wrap items-center justify-between gap-2 border-b border-[var(--creator-card-border,var(--border-color))] ${
                embedInReport ? "px-3 py-2" : "px-3 py-2.5"
              }`}
            >
              <div className="min-w-0">
                <div
                  className={`font-heading font-semibold text-[var(--text-main)] ${
                    embedInReport ? "text-xs" : "text-sm"
                  }`}
                >
                  {tPresets(g.preset)}{" "}
                  <span className="font-normal text-[var(--text-dimmer)]">({totalCount})</span>
                </div>
                {!embedInReport ? (
                  <div className="text-[10px] text-[var(--text-dimmer)]">{rankHint(g.primaryMetric)}</div>
                ) : null}
              </div>
              {!embedInReport ? (
                <span className="ds-table-compact-badge ds-table-compact-badge--accent">{tPresets(g.preset)}</span>
              ) : null}
            </div>

            {best.length ? (
              <CreativeCardGrid
                creatives={best}
                metrics={cols}
                primaryMetric={g.primaryMetric}
                campaignType={tPresets(g.preset)}
                clientSlug={clientSlug ?? ""}
                embedInReport={embedInReport}
              />
            ) : (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-dim)]">{t("empty")}</p>
            )}

            {g.promising.length && !embedInReport ? (
              <div className="border-t border-[var(--creator-card-border,var(--border-color))]">
                <div className="flex items-start gap-2 bg-[var(--ui-accent-muted)] px-3 py-2">
                  <span className="text-[var(--ui-accent)]">✦</span>
                  <div>
                    <div className="text-[11px] font-semibold text-[var(--ui-accent)]">{t("promisingTitle")}</div>
                    <div className="text-[10px] text-[var(--text-dim)]">{t("promisingDesc")}</div>
                  </div>
                </div>
                <CreativeCardGrid
                  creatives={g.promising}
                  metrics={cols}
                  primaryMetric={g.primaryMetric}
                  campaignType={tPresets(g.preset)}
                  clientSlug={clientSlug ?? ""}
                  showRank={false}
                />
              </div>
            ) : null}

            {!compactBest && g.noSpend.length ? (
              <div className="border-t border-[var(--border-color)]">
                <div className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedZero((prev) => ({ ...prev, [g.preset]: !prev[g.preset] }))
                    }
                    className="ds-table-compact-action text-[11px]"
                  >
                    {zeroOpen ? t("showLess") : t("showMoreZero", { n: g.noSpend.length })}
                  </button>
                </div>
                {zeroOpen ? (
                  <CreativeCardGrid
                    creatives={g.noSpend}
                    metrics={cols}
                    primaryMetric={g.primaryMetric}
                    campaignType={tPresets(g.preset)}
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
