"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
import { TableSkeleton } from "@/components/ui/Skeleton";

type CreativeItem = {
  name: string;
  type: string;
  status: string;
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
  clientSlug
}: {
  clientId: string;
  clientSlug?: string;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const tCampaigns = useTranslations("campaignsPage");
  const locale = useLocale();
  const [campaigns, setCampaigns] = useState<CampaignBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!clientId) {
      setCampaigns([]);
      return;
    }
    setLoading(true);
    fetch(`/api/creatives/by-campaign?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setCampaigns(j.campaigns ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

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

  if (loading) {
    return <TableSkeleton rows={5} columns={["media", "metric", "metric", "metric"]} />;
  }
  if (!campaigns.length) {
    return <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>;
  }

  return (
    <div className="space-y-5">
      {campaigns.map((camp) => {
        const metrics = presetMetricsFor(camp.preset);
        return (
          <div key={camp.campaignId} className="ui-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <Link
                href={`/campaigns/${camp.campaignId}?client=${encodeURIComponent(clientSlug ?? "")}`}
                className="truncate text-sm font-semibold text-slate-800 hover:text-violet-700 hover:underline"
              >
                {camp.campaignName}
              </Link>
              <Badge variant="brand">{tPresets(camp.preset)}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {camp.creatives.map((c, idx) => (
                <div key={`${c.name}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex gap-3">
                    {c.thumbnailUrl ? (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(c.imageUrl ?? c.thumbnailUrl)}
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
                          onClick={() => setLightboxUrl(c.imageUrl ?? c.thumbnailUrl)}
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
                    {metrics.map((m) => (
                      <div key={m} className="rounded-md bg-slate-50 px-2 py-1">
                        <div className="text-[9px] uppercase tracking-wide text-slate-400">
                          {tMetrics(METRIC_BY_KEY[m].label)}
                        </div>
                        <div className="text-xs font-semibold tabular-nums text-slate-800">
                          {formatMetricValue(m, Number(c.metrics[m] ?? 0), locale)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onMouseDown={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-lg text-white hover:bg-white/20"
            aria-label={t("close")}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            onMouseDown={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </div>
  );
}
