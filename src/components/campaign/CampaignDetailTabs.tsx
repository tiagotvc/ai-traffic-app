"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { campaignTabQuery, getRememberedAdset } from "@/lib/campaign-navigation";

export type CampaignDetailTab = "overview" | "adsets" | "ads" | "creatives" | "events";

type TabItem = {
  id: CampaignDetailTab;
  href?: string;
  label: string;
  disabled?: boolean;
};

export function campaignTabHref(
  tab: CampaignDetailTab,
  metaCampaignId: string,
  clientSlug: string,
  adsetId?: string | null
): string | undefined {
  const q = campaignTabQuery(clientSlug, tab === "ads" ? adsetId : undefined);
  switch (tab) {
    case "overview":
      return `/campaigns/${metaCampaignId}${q}`;
    case "adsets":
      return `/campaigns/${metaCampaignId}/adsets${q}`;
    case "ads":
      return `/campaigns/${metaCampaignId}/ads${q}`;
    case "creatives":
      return `/campaigns/${metaCampaignId}/creatives${q}`;
    case "events":
      return undefined;
    default:
      return undefined;
  }
}

export function CampaignDetailTabs({
  metaCampaignId,
  clientSlug,
  activeTab,
  adsetsCount,
  adsCount,
  creativesCount,
  embedded = false,
  onTabClick,
  translationNs = "campaignManager",
  adsetId
}: {
  metaCampaignId: string;
  clientSlug: string;
  activeTab: CampaignDetailTab;
  adsetsCount: number | null;
  adsCount: number | null;
  creativesCount?: number | null;
  embedded?: boolean;
  onTabClick?: (tab: CampaignDetailTab) => void;
  translationNs?: "campaignManager" | "adsetsPage" | "adsPage" | "creativesPage";
  adsetId?: string | null;
}) {
  const t = useTranslations(translationNs);
  const searchParams = useSearchParams();
  const urlAdset = searchParams.get("adset");
  const rememberedAdset = getRememberedAdset(metaCampaignId);
  const activeAdsetId = adsetId ?? urlAdset ?? rememberedAdset?.adsetId ?? null;
  const countLabel = (value: number | null) => (value === null ? "…" : value);

  const tabHref = (tab: CampaignDetailTab) =>
    campaignTabHref(tab, metaCampaignId, clientSlug, activeAdsetId);

  const tabs: TabItem[] = [
    {
      id: "overview",
      href: embedded ? undefined : tabHref("overview"),
      label: t("tabOverview")
    },
    {
      id: "adsets",
      href: embedded ? undefined : tabHref("adsets"),
      label: t("tabAdsets", { count: countLabel(adsetsCount) })
    },
    {
      id: "ads",
      href: embedded ? undefined : tabHref("ads"),
      label: t("tabAds", { count: countLabel(adsCount) })
    },
    {
      id: "creatives",
      href: embedded ? undefined : tabHref("creatives"),
      label: t("tabCreatives", { count: countLabel(creativesCount ?? null) })
    },
    {
      id: "events",
      href: undefined,
      label: t("tabEvents"),
      disabled: true
    }
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((item) => {
        const isActive = activeTab === item.id;
        const tabClass = `whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
          isActive
            ? "border-violet-600 text-violet-600"
            : item.disabled
              ? "border-transparent text-slate-300"
              : "border-transparent text-slate-500 hover:text-slate-700"
        }`;

        if (item.disabled) {
          return (
            <button key={item.id} type="button" disabled className={tabClass}>
              {item.label}
            </button>
          );
        }

        if (embedded) {
          const fullHref = tabHref(item.id);
          if (item.id === "overview" || item.id === "adsets") {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabClick?.(item.id)}
                className={tabClass}
              >
                {item.label}
              </button>
            );
          }
          if (fullHref) {
            return (
              <Link key={item.id} href={fullHref} className={tabClass}>
                {item.label}
              </Link>
            );
          }
        }

        if (!item.href) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabClick?.(item.id)}
              className={tabClass}
            >
              {item.label}
            </button>
          );
        }

        return (
          <Link key={item.id} href={item.href} className={tabClass}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
