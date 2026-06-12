"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { CreativePreviewModal } from "@/components/creatives/CreativePreviewModal";

export type CreativeItem = {
  name: string;
  type?: string;
  status: string;
  adId: string | null;
  adsCount: number;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  metrics: Partial<Record<MetricKey, number>>;
};

export function CreativeCardGrid({
  creatives,
  metrics,
  primaryMetric,
  clientSlug = "",
  showRank = true
}: {
  creatives: CreativeItem[];
  metrics: MetricKey[];
  primaryMetric: MetricKey;
  clientSlug?: string;
  showRank?: boolean;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const tCampaigns = useTranslations("campaignsPage");
  const locale = useLocale();
  const [previewing, setPreviewing] = useState<CreativeItem | null>(null);

  function dl(c: CreativeItem) {
    const u = c.imageUrl ?? c.thumbnailUrl;
    return u
      ? `/api/creatives/download?u=${encodeURIComponent(u)}&name=${encodeURIComponent(c.name)}`
      : null;
  }
  function statusLabel(s: string) {
    if (s === "ACTIVE") return tCampaigns("statusActive");
    if (s === "PAUSED") return tCampaigns("statusPaused");
    return tCampaigns("statusInactive");
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {creatives.map((c, idx) => (
          <div key={`${c.name}-${idx}`} className="rounded-xl border border-slate-200 p-3">
            <div className="flex gap-3">
              {c.thumbnailUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewing(c)}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                  title={t("view")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumbnailUrl}
                    alt=""
                    className="h-16 w-16 object-cover transition hover:opacity-80"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPreviewing(c)}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg"
                >
                  🖼️
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {showRank ? (
                    idx === 0 ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        ★ 1º
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">#{idx + 1}</span>
                    )
                  ) : null}
                  <Badge variant={c.status === "ACTIVE" ? "success" : "neutral"}>
                    {statusLabel(c.status)}
                  </Badge>
                </div>
                <div className="mt-1 truncate text-xs font-medium text-slate-800" title={c.name}>
                  {c.name}
                </div>
                <div className="mt-0.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewing(c)}
                    className="text-[11px] font-medium text-violet-600 hover:underline"
                  >
                    {t("view")}
                  </button>
                  {dl(c) ? (
                    <a
                      href={dl(c)!}
                      className="text-[11px] font-medium text-violet-600 hover:underline"
                    >
                      {t("download")}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {metrics.map((m) => {
                const isRank = m === primaryMetric;
                return (
                  <div
                    key={m}
                    className={`rounded-md px-2 py-1 ${
                      isRank ? "bg-violet-50 ring-1 ring-violet-200" : "bg-slate-50"
                    }`}
                  >
                    <div
                      className={`text-[9px] uppercase tracking-wide ${
                        isRank ? "text-violet-500" : "text-slate-400"
                      }`}
                    >
                      {isRank ? "★ " : ""}
                      {tMetrics(METRIC_BY_KEY[m].label)}
                    </div>
                    <div
                      className={`text-xs font-semibold tabular-nums ${
                        isRank ? "text-violet-800" : "text-slate-800"
                      }`}
                    >
                      {formatMetricValue(m, Number(c.metrics[m] ?? 0), locale)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {previewing ? (
        <CreativePreviewModal
          adId={previewing.adId}
          imageUrl={previewing.imageUrl ?? previewing.thumbnailUrl}
          name={previewing.name}
          downloadHref={dl(previewing)}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
    </>
  );
}
