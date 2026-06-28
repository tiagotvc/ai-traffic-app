"use client";

import { useState } from "react";

import {
  CreativeRankingCard,
  CreativeRankingCardsSkeleton
} from "@/components/creatives/CreativeRankingCard";
import { CreativeCompareModal } from "@/components/creatives/CreativeCompareModal";
import { CreativePreviewModal } from "@/components/creatives/CreativePreviewModal";
import { formatMetricValue, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

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
  creativeName?: string | null;
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
  const [previewing, setPreviewing] = useState<CreativeItem | null>(null);
  const [comparing, setComparing] = useState<CreativeItem | null>(null);

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
      ? "report-creatives-grid grid min-w-0 grid-cols-1 gap-4 p-3 [&>.report-creative-card]:mx-auto [&>.report-creative-card]:w-full [&>.report-creative-card]:max-w-[360px]"
      : creatives.length === 2
        ? "report-creatives-grid grid min-w-0 grid-cols-1 gap-4 p-3 sm:grid-cols-2"
        : "report-creatives-grid grid min-w-0 grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3 [&>.report-creative-card]:h-full";

  return (
    <>
      <div
        className={
          embedInReport
            ? reportGridClass
            : "grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }
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
              creativeName={c.creativeName}
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
              onCompare={canCompare ? () => setComparing(c) : undefined}
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
        <CreativeCompareModal creative={comparing} onClose={() => setComparing(null)} />
      ) : null}
    </>
  );
}

export { CreativeRankingCardsSkeleton };
