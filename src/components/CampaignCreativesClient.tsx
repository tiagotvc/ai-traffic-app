"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { CampaignDrilldownHeader } from "@/components/campaign/CampaignDrilldownHeader";
import { CampaignTabCountBadge } from "@/components/campaign/CampaignTabCountBadge";
import { CreativeCardGrid, type CreativeItem } from "@/components/creatives/CreativeCardGrid";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import { presetMetricsFor } from "@/lib/campaign-presets";
import { type MetricKey } from "@/lib/dashboard-metrics";
import { formatPeriodLabel, periodStateToParsed } from "@/lib/report-period";
import { useCampaignDrilldown } from "@/hooks/useCampaignDrilldown";
import { useLocale } from "next-intl";

type CreativeRowApi = {
  title: string;
  type?: string;
  status: string;
  adId?: string | null;
  usageAds?: number;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  metrics?: Partial<Record<MetricKey, number>>;
};

export function CampaignCreativesClient({
  metaCampaignId,
  clientSlug,
  embedded = false
}: {
  metaCampaignId: string;
  clientSlug: string;
  embedded?: boolean;
}) {
  const t = useTranslations("creativesPage");
  const tPeriod = useTranslations("period");
  const locale = useLocale();
  const drilldown = useCampaignDrilldown();
  const {
    campaign,
    counts,
    countsLoading,
    creatives: creativeRows,
    creativesPreset,
    creativesPrimaryMetric,
    period,
    setPeriod,
    refresh,
    loading
  } = drilldown;
  const [syncing, setSyncing] = useState(false);

  const periodLabel = useMemo(() => {
    return formatPeriodLabel(periodStateToParsed(period), locale, {
      today: tPeriod("today"),
      yesterday: tPeriod("yesterday"),
      thisWeek: tPeriod("thisWeek"),
      thisMonth: tPeriod("thisMonth"),
      thisQuarter: tPeriod("thisQuarter"),
      last7: tPeriod("last7"),
      last14: tPeriod("last14"),
      last15: tPeriod("last15"),
      last30: tPeriod("last30"),
      custom: tPeriod("custom"),
      all: tPeriod("all")
    });
  }, [period, locale, tPeriod]);

  const creatives = useMemo<CreativeItem[]>(
    () =>
      (creativeRows as CreativeRowApi[]).map((r) => ({
        name: r.title,
        type: r.type,
        status: r.status === "active" ? "ACTIVE" : "PAUSED",
        adId: r.adId ?? null,
        adsCount: r.usageAds ?? 0,
        thumbnailUrl: r.thumbnailUrl ?? null,
        imageUrl: r.imageUrl ?? null,
        metrics: r.metrics ?? {}
      })),
    [creativeRows]
  );

  const handleRefresh = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await refresh({ live: true });
    } finally {
      setSyncing(false);
    }
  }, [syncing, refresh]);

  if (loading || !campaign) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const slug = campaign.clientSlug || clientSlug;

  return (
    <div className="space-y-5">
      {!embedded ? (
        <p className="ui-breadcrumb">
          <Link href="/campaigns" className="ui-link">
            {t("navCampaigns")}
          </Link>
          {" › "}
          <span className="text-[var(--text-main)]">{campaign.name}</span>
        </p>
      ) : null}

      <CampaignDrilldownHeader
        campaign={campaign}
        locale={locale}
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={() => void handleRefresh()}
        syncing={syncing}
        translationNs="campaignManager"
        titleBadges={<CampaignTabCountBadge count={countsLoading ? "…" : creatives.length} />}
      />

      <CampaignDetailTabs
        metaCampaignId={metaCampaignId}
        clientSlug={slug}
        activeTab="creatives"
        adsetsCount={countsLoading ? null : counts.adsets}
        adsCount={countsLoading ? null : counts.ads}
        creativesCount={countsLoading ? null : counts.creatives}
        embedded={embedded}
        translationNs="creativesPage"
      />

      <p className="text-xs text-[var(--text-dim)]">
        {t("metricsPeriodHint", { period: periodLabel })}
      </p>

      <CreativeCardGrid
        creatives={creatives}
        metrics={presetMetricsFor(creativesPreset)}
        primaryMetric={creativesPrimaryMetric as MetricKey}
        campaignType={creativesPreset}
        clientSlug={slug}
        loading={loading}
      />
    </div>
  );
}
