"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { CreativePreviewModal } from "@/components/creatives/CreativePreviewModal";

export type CreativeBreakdown = {
  campaignId: string;
  campaignName: string;
  adsCount: number;
  metrics: Partial<Record<MetricKey, number>>;
};

export type CreativeItem = {
  name: string;
  type?: string;
  status: string;
  adId: string | null;
  adsCount: number;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  metrics: Partial<Record<MetricKey, number>>;
  campaigns?: Array<{ id: string; name: string }>;
  breakdown?: CreativeBreakdown[];
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
  const [comparing, setComparing] = useState<CreativeItem | null>(null);

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
                  {c.breakdown && c.breakdown.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setComparing(c)}
                      className="text-[11px] font-medium text-violet-600 hover:underline"
                    >
                      {t("compare")}
                    </button>
                  ) : null}
                </div>
                {c.campaigns && c.campaigns.length ? (
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {t("usedInCampaigns", { n: c.campaigns.length })}
                  </div>
                ) : null}
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

      {comparing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onMouseDown={() => setComparing(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-800">{comparing.name}</div>
                <div className="text-xs text-slate-400">{t("comparePerf")}</div>
              </div>
              <button
                type="button"
                onClick={() => setComparing(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="close"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">{t("colCampaign")}</th>
                    {metrics.map((m) => (
                      <th key={m} className="px-3 py-2 text-right">
                        {tMetrics(METRIC_BY_KEY[m].label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(comparing.breakdown ?? []).map((b) => (
                    <tr key={b.campaignId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <div className="max-w-[260px] truncate text-slate-800">{b.campaignName}</div>
                        <div className="text-[10px] text-slate-400">{b.adsCount} anúncio(s)</div>
                      </td>
                      {metrics.map((m) => (
                        <td key={m} className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          {formatMetricValue(m, Number(b.metrics[m] ?? 0), locale)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-violet-50/40 font-semibold">
                    <td className="px-4 py-2.5 text-violet-800">{t("total")}</td>
                    {metrics.map((m) => (
                      <td key={m} className="px-3 py-2.5 text-right tabular-nums text-violet-800">
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
