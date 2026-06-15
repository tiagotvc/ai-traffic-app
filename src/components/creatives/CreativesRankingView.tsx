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
  periodQuery = ""
}: {
  clientId: string;
  clientSlug?: string;
  periodQuery?: string;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const [groups, setGroups] = useState<Group[]>([]);
  const [warnings, setWarnings] = useState<CreativeAccessWarning[]>([]);
  const [partialData, setPartialData] = useState(false);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedZero, setExpandedZero] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    if (!clientId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/creatives/performance?clientId=${encodeURIComponent(clientId)}&${periodQuery}`)
      .then(async (r) => {
        const j = await r.json();
        if (j.ok) {
          setGroups(j.groups ?? []);
          setWarnings(j.warnings ?? []);
          setPartialData(Boolean(j.partialData));
          setDataSource(j.dataSource ?? r.headers.get("X-Data-Source"));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId, periodQuery]);

  useEffect(() => {
    load();
  }, [load]);

  function rankHint(metric: MetricKey) {
    const dir = COST_METRICS.has(metric) ? t("rankLower") : t("rankHigher");
    return `${t("rankedBy")} ${tMetrics(METRIC_BY_KEY[metric].label)} (${dir})`;
  }

  if (loading) {
    return <TableSkeleton rows={5} columns={["media", "metric", "metric", "metric"]} />;
  }

  const banner = (
    <>
      {dataSource === "cached" || dataSource === "mixed" ? (
        <div className="flex justify-end">
          <Badge variant="neutral">{t("dataCached")}</Badge>
        </div>
      ) : null}
      <CreativesAccessWarningBanner warnings={warnings} partialData={partialData} />
    </>
  );

  if (!groups.length) {
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
                creatives={g.best}
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
                  creatives={g.promising}
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
