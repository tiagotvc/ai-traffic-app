"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { CampaignDrilldownHeader } from "@/components/campaign/CampaignDrilldownHeader";
import { CreativeCardGrid, type CreativeItem } from "@/components/creatives/CreativeCardGrid";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";
import { presetMetricsFor } from "@/lib/campaign-presets";
import { type MetricKey } from "@/lib/dashboard-metrics";
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
    <div className="space-y-4">
      {!embedded ? (
        <DsPageHeader
          breadcrumbs={
            <>
              <Link href="/campaigns" className="ui-link">
                {t("navCampaigns")}
              </Link>
              {" › "}
              <Link
                href={`/campaigns/${metaCampaignId}?client=${encodeURIComponent(slug)}`}
                className="ui-link"
              >
                {campaign.name}
              </Link>
              {" › "}
              <span>{t("title")}</span>
            </>
          }
          title={t("title")}
          subtitle={t("subtitle")}
        />
      ) : null}

      <CampaignDrilldownHeader
        campaign={campaign}
        locale={locale}
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={() => void handleRefresh()}
        syncing={syncing}
        translationNs="campaignManager"
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
