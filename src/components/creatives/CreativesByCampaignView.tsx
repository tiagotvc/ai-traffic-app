"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CreativeCardGrid, type CreativeItem } from "@/components/creatives/CreativeCardGrid";

type CampaignBlock = {
  campaignId: string;
  campaignName: string;
  preset: string;
  primaryMetric: MetricKey;
  spend: number;
  creatives: CreativeItem[];
};

const COST_METRICS = new Set<MetricKey>(["cpmsg", "cpa", "cpm", "cpc"]);

export function CreativesByCampaignView({
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
  const [campaigns, setCampaigns] = useState<CampaignBlock[]>([]);
  const [warnings, setWarnings] = useState<Array<{ account: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!clientId) {
      setCampaigns([]);
      return;
    }
    setLoading(true);
    fetch(`/api/creatives/by-campaign?clientId=${encodeURIComponent(clientId)}&${periodQuery}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setCampaigns(j.campaigns ?? []);
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
      <div className="ui-alert-warning px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">{t("accessWarningTitle")}</p>
        <p className="mt-0.5 text-xs">
          {t("accessWarningBody")} {warnings.map((w) => w.label).join(", ")}
        </p>
      </div>
    ) : null;

  if (!campaigns.length) {
    return (
      <div className="space-y-4">
        {banner}
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("empty")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {banner}
      {campaigns.map((camp) => (
        <div key={camp.campaignId} className="ui-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-3">
            <div className="min-w-0">
              <Link
                href={`/campaigns/${camp.campaignId}?client=${encodeURIComponent(clientSlug ?? "")}`}
                className="block truncate text-sm font-semibold text-[var(--text-main)] hover:text-[var(--violet-bright)] hover:underline"
              >
                {camp.campaignName}
              </Link>
              <div className="text-[11px] text-[var(--text-dimmer)]">{rankHint(camp.primaryMetric)}</div>
            </div>
            <Badge variant="brand">{tPresets(camp.preset)}</Badge>
          </div>
          <CreativeCardGrid
            creatives={camp.creatives}
            metrics={presetMetricsFor(camp.preset)}
            primaryMetric={camp.primaryMetric}
            clientSlug={clientSlug ?? ""}
          />
        </div>
      ))}
    </div>
  );
}
