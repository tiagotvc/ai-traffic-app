"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  CreativeRankingCard,
  CreativeRankingCardsSkeleton
} from "@/components/creatives/CreativeRankingCard";
import { CreativePreviewModal } from "@/components/creatives/CreativePreviewModal";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";

export type CreativeBreakdown = {
  campaignId: string;
  campaignName: string;
  adsCount: number;
  metrics: Partial<Record<MetricKey, number>>;
};

export type CreativeAdsetBreakdown = {
  adsetId: string;
  adsetName: string;
  campaignName: string;
  adsCount: number;
  metrics: Partial<Record<MetricKey, number>>;
};

export type CreativeItem = {
  name: string;
  type?: string;
  status: string;
  adId: string | null;
  adIds?: string[];
  creativeId?: string | null;
  adsCount: number;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  metrics: Partial<Record<MetricKey, number>>;
  campaigns?: Array<{ id: string; name: string }>;
  breakdown?: CreativeBreakdown[];
  breakdownAdsets?: CreativeAdsetBreakdown[];
};

function scoreForRank(rank: number, total: number) {
  if (total <= 1) return 95;
  return Math.max(35, Math.round(100 - ((rank - 1) / (total - 1)) * 55));
}

export function CreativeCardGrid({
  creatives,
  metrics,
  primaryMetric,
  campaignType,
  clientSlug = "",
  showRank = true,
  loading = false,
  embedInReport = false
}: {
  creatives: CreativeItem[];
  metrics: MetricKey[];
  primaryMetric: MetricKey;
  campaignType?: string;
  clientSlug?: string;
  showRank?: boolean;
  loading?: boolean;
  embedInReport?: boolean;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [previewing, setPreviewing] = useState<CreativeItem | null>(null);
  const [comparing, setComparing] = useState<CreativeItem | null>(null);
  const [cmpMode, setCmpMode] = useState<"campaign" | "adset">("campaign");

  const cmpRows: Array<{
    id: string;
    label: string;
    sub: string;
    metrics: Partial<Record<MetricKey, number>>;
  }> = !comparing
    ? []
    : cmpMode === "adset"
      ? (comparing.breakdownAdsets ?? []).map((b) => ({
          id: b.adsetId,
          label: b.adsetName,
          sub: `${b.campaignName ? b.campaignName + " · " : ""}${b.adsCount} anúncio(s)`,
          metrics: b.metrics
        }))
      : (comparing.breakdown ?? []).map((b) => ({
          id: b.campaignId,
          label: b.campaignName,
          sub: `${b.adsCount} anúncio(s)`,
          metrics: b.metrics
        }));

  if (loading) {
    return (
      <CreativeRankingCardsSkeleton
        count={Math.min(creatives.length || 3, 6)}
        compact={embedInReport}
      />
    );
  }

  const metricKeys = metrics.length ? metrics : (["roas", "ctr", "cpa", "cpm", "impressions", "spend"] as MetricKey[]);

  const reportGridClass =
    creatives.length === 1
      ? "report-creatives-grid grid min-w-0 grid-cols-1 gap-3 p-3 [&>.report-creative-card]:mx-auto [&>.report-creative-card]:w-full [&>.report-creative-card]:max-w-[320px]"
      : creatives.length === 2
        ? "report-creatives-grid grid min-w-0 grid-cols-1 gap-3 p-3 sm:grid-cols-2"
        : "report-creatives-grid grid min-w-0 grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      <div
        className={
          embedInReport
            ? reportGridClass
            : "grid gap-4 p-4"
        }
        style={embedInReport ? undefined : { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        data-report-creatives-grid={embedInReport ? "true" : undefined}
      >
        {creatives.map((c, idx) => {
          const rank = showRank ? idx + 1 : idx + 1;
          const canCompare =
            (c.breakdown && c.breakdown.length > 1) ||
            (c.breakdownAdsets && c.breakdownAdsets.length > 1);

          return (
            <CreativeRankingCard
              key={`${c.name}-${idx}`}
              rank={rank}
              title={c.name}
              type={c.type}
              campaignType={campaignType}
              campaignsUsed={c.campaigns?.length ?? c.adsCount ?? 0}
              status={c.status}
              imageUrl={c.imageUrl}
              thumbnailUrl={c.thumbnailUrl}
              score={scoreForRank(rank, creatives.length)}
              metrics={c.metrics}
              primaryMetric={primaryMetric}
              metricKeys={metricKeys}
              variant={embedInReport ? "report" : "default"}
              onPreview={() => setPreviewing(c)}
              onCompare={canCompare ? () => { setCmpMode("campaign"); setComparing(c); } : undefined}
            />
          );
        })}
      </div>

      {previewing ? (
        <CreativePreviewModal
          adId={previewing.adId}
          adIds={previewing.adIds}
          imageUrl={previewing.imageUrl ?? previewing.thumbnailUrl}
          name={previewing.name}
          rank={creatives.indexOf(previewing) + 1}
          type={previewing.type}
          campaignType={campaignType}
          status={previewing.status}
          metrics={previewing.metrics}
          campaignsUsed={previewing.campaigns?.length ?? previewing.adsCount ?? 0}
          onClose={() => setPreviewing(null)}
        />
      ) : null}

      {comparing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={() => setComparing(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-5 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--text-main)]">{comparing.name}</div>
                <div className="text-xs text-[var(--text-dimmer)]">{t("comparePerf")}</div>
              </div>
              <button
                type="button"
                onClick={() => setComparing(null)}
                className="rounded-lg p-1 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
                aria-label="close"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-1 border-b border-[var(--border-color)] px-5 py-2">
              {(["campaign", "adset"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCmpMode(mode)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    cmpMode === mode
                      ? "bg-[rgba(245,166,35,0.12)] text-[var(--amber)]"
                      : "text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                  }`}
                >
                  {mode === "campaign" ? t("cmpByCampaign") : t("cmpByAdset")}
                </button>
              ))}
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-[var(--surface-thead)] text-[11px] font-semibold uppercase text-[var(--text-dim)]">
                  <tr>
                    <th className="px-4 py-2">
                      {cmpMode === "adset" ? t("colAdset") : t("colCampaign")}
                    </th>
                    {metrics.map((m) => (
                      <th key={m} className="px-3 py-2 text-right">
                        {tMetrics(METRIC_BY_KEY[m].label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {cmpRows.map((b, i) => (
                    <tr key={`${b.id}-${i}`} className="hover:bg-[var(--surface-bg)]/60">
                      <td className="px-4 py-2.5">
                        <div className="max-w-[260px] truncate text-[var(--text-main)]">{b.label}</div>
                        <div className="text-[10px] text-[var(--text-dimmer)]">{b.sub}</div>
                      </td>
                      {metrics.map((m) => (
                        <td key={m} className="px-3 py-2.5 text-right tabular-nums text-[var(--text-dim)]">
                          {formatMetricValue(m, Number(b.metrics[m] ?? 0), locale)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-[rgba(245,166,35,0.06)]/40 font-semibold hover:bg-[var(--row-hover)]">
                    <td className="px-4 py-2.5 text-[var(--amber)]">{t("total")}</td>
                    {metrics.map((m) => (
                      <td key={m} className="px-3 py-2.5 text-right tabular-nums text-[var(--amber)]">
                        {formatMetricValue(m, Number(comparing.metrics[m] ?? 0), locale)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export { CreativeRankingCardsSkeleton };
