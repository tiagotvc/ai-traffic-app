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

  function statusLabel(s: string) {
    if (s === "ACTIVE") return tCampaigns("statusActive");
    if (s === "PAUSED") return tCampaigns("statusPaused");
    return tCampaigns("statusInactive");
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {creatives.map((c, idx) => (
          <div key={`${c.name}-${idx}`} className="rounded-xl border border-[var(--border-color)] p-3">
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
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-bg)] text-lg"
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
                      <span className="text-[10px] text-[var(--text-dimmer)]">#{idx + 1}</span>
                    )
                  ) : null}
                  <Badge variant={c.status === "ACTIVE" ? "success" : "neutral"}>
                    {statusLabel(c.status)}
                  </Badge>
                </div>
                <div className="mt-1 truncate text-xs font-medium text-[var(--text-main)]" title={c.name}>
                  {c.name}
                </div>
                <div className="mt-0.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewing(c)}
                    className="text-[11px] font-medium text-[var(--violet)] hover:underline"
                  >
                    {t("view")}
                  </button>
                  {(c.breakdown && c.breakdown.length > 1) ||
                  (c.breakdownAdsets && c.breakdownAdsets.length > 1) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCmpMode("campaign");
                        setComparing(c);
                      }}
                      className="text-[11px] font-medium text-[var(--violet)] hover:underline"
                    >
                      {t("compare")}
                    </button>
                  ) : null}
                </div>
                {c.campaigns && c.campaigns.length ? (
                  <div className="mt-0.5 text-[10px] text-[var(--text-dimmer)]">
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
                      isRank ? "bg-[rgba(124,58,237,0.06)] ring-1 ring-violet-200" : "bg-[var(--surface-bg)]"
                    }`}
                  >
                    <div
                      className={`text-[9px] uppercase tracking-wide ${
                        isRank ? "text-violet-500" : "text-[var(--text-dimmer)]"
                      }`}
                    >
                      {isRank ? "★ " : ""}
                      {tMetrics(METRIC_BY_KEY[m].label)}
                    </div>
                    <div
                      className={`text-xs font-semibold tabular-nums ${
                        isRank ? "text-[var(--violet)]" : "text-[var(--text-main)]"
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
          adIds={previewing.adIds}
          imageUrl={previewing.imageUrl ?? previewing.thumbnailUrl}
          name={previewing.name}
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
                      ? "bg-[rgba(124,58,237,0.1)] text-[var(--violet)]"
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
                  <tr className="bg-[rgba(124,58,237,0.06)]/40 font-semibold hover:bg-[var(--row-hover)]">
                    <td className="px-4 py-2.5 text-[var(--violet)]">{t("total")}</td>
                    {metrics.map((m) => (
                      <td key={m} className="px-3 py-2.5 text-right tabular-nums text-[var(--violet)]">
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
