"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import type { CreativeItem } from "@/components/creatives/CreativeCardGrid";

export function CreativeCompareModal({
  creative,
  onClose
}: {
  creative: CreativeItem;
  onClose: () => void;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [cmpMode, setCmpMode] = useState<"campaign" | "adset">("campaign");

  const metrics = useMemo(() => {
    const keys = Object.keys(creative.metrics) as MetricKey[];
    return keys.length ? keys : (["spend", "ctr", "cpm", "impressions"] as MetricKey[]);
  }, [creative.metrics]);

  const cmpRows = useMemo(() => {
    if (cmpMode === "adset") {
      return (creative.breakdownAdsets ?? []).map((b) => ({
        id: b.adsetId,
        label: b.adsetName,
        sub: `${b.campaignName ? b.campaignName + " · " : ""}${b.adsCount} anúncio(s)`,
        metrics: b.metrics
      }));
    }
    return (creative.breakdown ?? []).map((b) => ({
      id: b.campaignId,
      label: b.campaignName,
      sub: `${b.adsCount} anúncio(s)`,
      metrics: b.metrics
    }));
  }, [cmpMode, creative.breakdown, creative.breakdownAdsets]);

  const canCompare =
    (creative.breakdown?.length ?? 0) > 1 || (creative.breakdownAdsets?.length ?? 0) > 1;

  if (!canCompare) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--text-main)]">{creative.name}</div>
            <div className="text-xs text-[var(--text-dimmer)]">{t("comparePerf")}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                    {formatMetricValue(m, Number(creative.metrics[m] ?? 0), locale)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
