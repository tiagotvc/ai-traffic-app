"use client";

import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";

import {
  BillingPortalClient,
  parseBillingTab,
  type PortalTab
} from "@/components/billing/BillingPortalClient";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";
import { CompactPageHeader } from "@/components/layout/CompactPageHeader";
import { PageTabs } from "@/components/layout/PageTabs";
import { SettingsClient, parseSettingsTab, type SettingsTab } from "@/components/SettingsClient";

export type ProfileTab = PortalTab | SettingsTab;

const BILLING_TABS = new Set<PortalTab>(["plan", "limits", "billing", "events"]);
const SETTINGS_TABS = new Set<SettingsTab>(["general", "team", "integrations", "webhooks", "data"]);

function parseProfileTab(raw: string | null): ProfileTab {
  if (raw && BILLING_TABS.has(raw as PortalTab)) return raw as PortalTab;
  if (raw && SETTINGS_TABS.has(raw as SettingsTab)) return raw as SettingsTab;
  return "plan";
}

function isBillingTab(tab: ProfileTab): tab is PortalTab {
  return BILLING_TABS.has(tab as PortalTab);
}

function ProfileClientInner({
  locale,
  metaOAuthConfigured,
  metaOAuthError,
  connectMetaSlot
}: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError?: string | null;
  connectMetaSlot: ReactNode;
}) {
  const tNav = useTranslations("nav");
  const tSettings = useTranslations("settings");
  const tBilling = useTranslations("billingPage");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<ProfileTab>(() =>
    parseProfileTab(searchParams.get("tab"))
  );

  useEffect(() => {
    setActiveTab(parseProfileTab(searchParams.get("tab")));
  }, [searchParams]);

  const selectTab = useCallback(
    (tab: ProfileTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      if (tab !== "billing") params.delete("invoice");
      router.replace(`/settings?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const tabs = useMemo(
    () => [
      { key: "plan" as const, label: tBilling("tabPlan") },
      { key: "limits" as const, label: tBilling("tabLimits") },
      {
        key: "billing" as const,
        label: tBilling("tabBilling")
      },
      { key: "events" as const, label: tBilling("tabEvents") },
      { key: "general" as const, label: tSettings("tabGeneral") },
      { key: "team" as const, label: tSettings("tabTeam") },
      { key: "integrations" as const, label: tSettings("tabIntegrations") },
      { key: "webhooks" as const, label: tSettings("tabWebhooks") },
      { key: "data" as const, label: tSettings("tabData") }
    ],
    [tBilling, tSettings]
  );

  const billingTab = isBillingTab(activeTab) ? activeTab : "plan";
  const settingsTab = !isBillingTab(activeTab) ? activeTab : "general";

  return (
    <div className="w-full space-y-4">
      <CompactPageHeader
        title={tNav("profile")}
        subtitle={tSettings("profileSubtitle")}
        actions={
          isBillingTab(activeTab) ? (
            <Link
              href="/billing/plans"
              className="ui-btn-primary text-xs"
            >
              {tBilling("viewPlans")}
            </Link>
          ) : undefined
        }
      />

      <PageTabs tabs={tabs} active={activeTab} onChange={selectTab} />

      {isBillingTab(activeTab) ? (
        <Suspense fallback={<BillingPortalSkeleton />}>
          <BillingPortalClient
            embedded
            basePath="/settings"
            activeTab={billingTab}
            onActiveTabChange={(tab) => selectTab(tab)}
          />
        </Suspense>
      ) : (
        <SettingsClient
          locale={locale}
          metaOAuthConfigured={metaOAuthConfigured}
          metaOAuthError={metaOAuthError}
          connectMetaSlot={connectMetaSlot}
          embedded
          activeTab={settingsTab}
          onActiveTabChange={(tab) => selectTab(tab)}
        />
      )}
    </div>
  );
}

export function ProfileClient(props: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError?: string | null;
  connectMetaSlot: ReactNode;
}) {
  return (
    <Suspense fallback={<BillingPortalSkeleton />}>
      <ProfileClientInner {...props} />
    </Suspense>
  );
}

export { parseBillingTab, parseSettingsTab };
