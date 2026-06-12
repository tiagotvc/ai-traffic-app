"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { type MetricKey, METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
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
  const [warnings, setWarnings] = useState<
    Array<{ account: string; label: string; needsReconnect?: boolean; reason?: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [expandedZero, setExpandedZero] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    if (!clientId) {
      setGroups([]);
      return;
    }
    setLoading(true);
    fetch(`/api/creatives/performance?clientId=${encodeURIComponent(clientId)}&${periodQuery}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setGroups(j.groups ?? []);
          setWarnings(j.warnings ?? []);
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

  const banner =
    warnings.length > 0 ? (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">{t("accessWarningTitle")}</p>
        <p className="mt-0.5 text-xs">
          {t("accessWarningBody")} {warnings.map((w) => w.label).join(", ")}
        </p>
      </div>
    ) : null;

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
