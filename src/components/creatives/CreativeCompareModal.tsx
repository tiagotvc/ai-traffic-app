"use client";

import { BarChart2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import type { CreativeItem } from "@/components/creatives/CreativeCardGrid";
import { cn } from "@/lib/cn";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";

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
    <CreatorModalShell
      open
      onClose={onClose}
      title={creative.name}
      subtitle={t("comparePerf")}
      titleIcon={<BarChart2 size={18} aria-hidden />}
      width="xl"
      hideFooter
      contentClassName="!px-0 !py-0"
    >
      <div className="flex gap-1 border-b border-[var(--border-color)] px-5 py-2">
        {(["campaign", "adset"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setCmpMode(mode)}
            className={cn(
              "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--chip-sm",
              cmpMode === mode
                ? "campaign-creator-budget-choice-card--selected"
                : "campaign-creator-budget-choice-card--unselected"
            )}
          >
            <span className="campaign-creator-budget-choice-card__label">
              {mode === "campaign" ? t("cmpByCampaign") : t("cmpByAdset")}
            </span>
          </button>
        ))}
      </div>
      <div className="overflow-auto">
        <div className="ui-campaign-table-shell ui-campaign-table-shell--compact border-0 shadow-none">
          <table className="ui-campaign-table ui-campaign-table--compact w-full min-w-[520px] text-left">
            <thead>
              <tr>
                <th className="px-2.5 py-1.5 text-left">
                  {cmpMode === "adset" ? t("colAdset") : t("colCampaign")}
                </th>
                {metrics.map((m) => (
                  <th key={m} className="px-2.5 py-1.5 text-right">
                    {tMetrics(METRIC_BY_KEY[m].label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cmpRows.map((b, i) => (
                <tr key={`${b.id}-${i}`} className="hover:bg-[var(--row-hover)]">
                  <td className="px-2.5 py-2">
                    <div className="max-w-[260px] truncate text-xs text-[var(--text-main)]">{b.label}</div>
                    <div className="text-[10px] text-[var(--text-dimmer)]">{b.sub}</div>
                  </td>
                  {metrics.map((m) => (
                    <td key={m} className="px-2.5 py-2 text-right tabular-nums text-xs text-[var(--text-dim)]">
                      {formatMetricValue(m, Number(b.metrics[m] ?? 0), locale)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-[var(--ui-accent-muted)]/40 font-semibold">
                <td className="px-2.5 py-2 text-xs text-[var(--ui-accent)]">{t("total")}</td>
                {metrics.map((m) => (
                  <td key={m} className="px-2.5 py-2 text-right tabular-nums text-xs text-[var(--ui-accent)]">
                    {formatMetricValue(m, Number(creative.metrics[m] ?? 0), locale)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </CreatorModalShell>
  );
}
