"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { rememberCampaign } from "@/components/CampaignsListClient";
import { CampaignDetailTabs } from "@/components/campaign/CampaignDetailTabs";
import { CreativeCardGrid, type CreativeItem } from "@/components/creatives/CreativeCardGrid";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";
import { presetMetricsFor } from "@/lib/campaign-presets";
import { type MetricKey } from "@/lib/dashboard-metrics";

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

type Campaign = {
  id: string;
  name: string;
  status: string;
  clientSlug: string;
  clientName: string;
  accountLabel: string;
  objective: string;
};

function statusVariant(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PAUSED") return "warning" as const;
  return "neutral" as const;
}

function statusLabel(status: string, t: (k: string) => string) {
  if (status === "ACTIVE") return t("statusActive");
  if (status === "PAUSED") return t("statusPaused");
  return status;
}

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
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [adsetsCount, setAdsetsCount] = useState<number | null>(null);
  const [adsCount, setAdsCount] = useState<number | null>(null);
  const [creativesCount, setCreativesCount] = useState<number | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [creatives, setCreatives] = useState<CreativeItem[]>([]);
  const [creativesPreset, setCreativesPreset] = useState("default");
  const [primaryMetric, setPrimaryMetric] = useState<MetricKey>("ctr");
  const [creativesLoading, setCreativesLoading] = useState(true);

  const reload = useCallback(() => {
    setCountsLoading(true);

    fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.campaign) {
          setCampaign(j.campaign);
          rememberCampaign(metaCampaignId, j.campaign.clientSlug || clientSlug);
        }
      });

    const adsetsPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/adsets`)
      .then((r) => r.json())
      .then((j) => setAdsetsCount((j.adsets ?? []).length))
      .catch(() => setAdsetsCount(0));

    const adsPromise = fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/ads`)
      .then((r) => r.json())
      .then((j) => setAdsCount(j.total ?? (j.ads ?? []).length))
      .catch(() => setAdsCount(0));

    setCreativesLoading(true);
    fetch(
      `/api/campaigns/${encodeURIComponent(metaCampaignId)}/creatives?clientSlug=${encodeURIComponent(clientSlug)}`
    )
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        const items: CreativeItem[] = ((j.rows ?? []) as CreativeRowApi[]).map((r) => ({
          name: r.title,
          type: r.type,
          status: r.status === "active" ? "ACTIVE" : "PAUSED",
          adId: r.adId ?? null,
          adsCount: r.usageAds ?? 0,
          thumbnailUrl: r.thumbnailUrl ?? null,
          imageUrl: r.imageUrl ?? null,
          metrics: r.metrics ?? {}
        }));
        setCreatives(items);
        setCreativesPreset(j.preset ?? "default");
        setPrimaryMetric((j.primaryMetric ?? "ctr") as MetricKey);
        setCreativesCount(items.length);
      })
      .catch(() => {})
      .finally(() => setCreativesLoading(false));

    void Promise.all([adsetsPromise, adsPromise]).finally(() => setCountsLoading(false));
  }, [metaCampaignId, clientSlug]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!campaign) {
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
          actions={
            <button type="button" onClick={reload} className="ui-btn-secondary px-3 text-sm">
              ↻
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[var(--text-main)]">{t("title")}</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t("subtitle")}</p>
          </div>
          <button type="button" onClick={reload} className="ui-btn-secondary px-3 text-sm">
            ↻
          </button>
        </div>
      )}

      <div className="ui-card flex flex-wrap items-center gap-3 p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
          f
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--text-main)]">{campaign.name}</span>
            <Badge variant={statusVariant(campaign.status)}>{statusLabel(campaign.status, t)}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-[var(--text-dim)]">
            <span>ID: {campaign.id}</span>
            <span>
              {t("client")}: {campaign.clientName}
            </span>
            <span>
              {t("account")}: {campaign.accountLabel}
            </span>
          </div>
        </div>
      </div>

      <CampaignDetailTabs
        metaCampaignId={metaCampaignId}
        clientSlug={slug}
        activeTab="creatives"
        adsetsCount={countsLoading ? null : adsetsCount}
        adsCount={countsLoading ? null : adsCount}
        creativesCount={creativesCount}
        embedded={embedded}
        translationNs="creativesPage"
      />

      <div className="ui-card overflow-hidden">
        {creativesLoading ? (
          <TableSkeleton bare rows={4} columns={["media", "metric", "metric", "metric"]} />
        ) : creatives.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--text-dim)]">{t("empty")}</p>
        ) : (
          <CreativeCardGrid
            creatives={creatives}
            metrics={presetMetricsFor(creativesPreset)}
            primaryMetric={primaryMetric}
            clientSlug={slug}
          />
        )}
      </div>
    </div>
  );
}
