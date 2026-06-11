"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CreativePreviewModal } from "@/components/creatives/CreativePreviewModal";

type CreativeItem = {
  name: string;
  type: string;
  status: string;
  adId: string | null;
  adsCount: number;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  metrics: Partial<Record<MetricKey, number>>;
};
type CampaignBlock = {
  campaignId: string;
  campaignName: string;
  preset: string;
  primaryMetric: MetricKey;
  spend: number;
  creatives: CreativeItem[];
};

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
  const tCampaigns = useTranslations("campaignsPage");
  const locale = useLocale();
  const [campaigns, setCampaigns] = useState<CampaignBlock[]>([]);
  const [warnings, setWarnings] = useState<Array<{ account: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState<CreativeItem | null>(null);

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

  function dl(c: CreativeItem) {
    const u = c.imageUrl ?? c.thumbnailUrl;
    return u ? `/api/creatives/download?u=${encodeURIComponent(u)}&name=${encodeURIComponent(c.name)}` : null;
  }
  function statusLabel(s: string) {
    if (s === "ACTIVE") return tCampaigns("statusActive");
    if (s === "PAUSED") return tCampaigns("statusPaused");
    return tCampaigns("statusInactive");
  }
  const COST_METRICS = new Set<MetricKey>(["cpmsg", "cpa", "cpm", "cpc"]);
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

  if (!campaigns.length) {
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
      {campaigns.map((camp) => {
        const metrics = presetMetricsFor(camp.preset);
        return (
          <div key={camp.campaignId} className="ui-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/campaigns/${camp.campaignId}?client=${encodeURIComponent(clientSlug ?? "")}`}
                  className="block truncate text-sm font-semibold text-slate-800 hover:text-violet-700 hover:underline"
                >
                  {camp.campaignName}
                </Link>
                <div className="text-[11px] text-slate-400">{rankHint(camp.primaryMetric)}</div>
              </div>
              <Badge variant="brand">{tPresets(camp.preset)}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {camp.creatives.map((c, idx) => (
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
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                        🖼️
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {idx === 0 ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            ★ 1º
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">#{idx + 1}</span>
                        )}
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
                      const isRank = m === camp.primaryMetric;
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
          </div>
        );
      })}

      {previewing ? (
        <CreativePreviewModal
          adId={previewing.adId}
          imageUrl={previewing.imageUrl ?? previewing.thumbnailUrl}
          name={previewing.name}
          downloadHref={dl(previewing)}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
    </div>
  );
}
