"use client";

import type { ReactNode } from "react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CreditCard, Plug, Settings as SettingsIcon, ShieldCheck, Sparkles, Users, type LucideIcon } from "lucide-react";

import { BillingPortalClient } from "@/components/billing/BillingPortalClient";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";
import { SettingsClient } from "@/components/SettingsClient";
import { SettingsAiCreditsTab } from "@/components/settings/SettingsAiCreditsTab";
import { DsFlatPanel, DsPageHeader, DsTabBar, type DsTab } from "@/design-system";

type TabId = "general" | "plan" | "aiCredits" | "integrations" | "team" | "data";
type SettingsClientTab = "general" | "integrations" | "team" | "data";
const VALID_TABS: TabId[] = ["general", "plan", "aiCredits", "integrations", "team", "data"];

export function SettingsContentLive({
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
  const t = useTranslations("settings");
  const tBilling = useTranslations("billingPage");
  const tAi = useTranslations("aiCredits");
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as TabId | null;
  const [active, setActive] = useState<TabId>(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : "general"
  );

  const iconFor: Record<TabId, LucideIcon> = {
    general: SettingsIcon,
    plan: CreditCard,
    aiCredits: Sparkles,
    integrations: Plug,
    team: Users,
    data: ShieldCheck
  };
  const tabs: DsTab<TabId>[] = [
    { value: "general", label: t("tabGeneral") },
    { value: "plan", label: tBilling("tabPlan") },
    { value: "aiCredits", label: tAi("tabAiCredits") },
    { value: "integrations", label: t("tabIntegrations") },
    { value: "team", label: t("tabTeam") },
    { value: "data", label: t("tabData") }
  ].map((tab) => {
    const Icon = iconFor[tab.value as TabId];
    return { ...tab, value: tab.value as TabId, icon: <Icon size={14} /> };
  });

  function renderPanel(id: TabId): ReactNode {
    if (id === "plan") {
      return (
        <Suspense fallback={<BillingPortalSkeleton embedded />}>
          <BillingPortalClient embedded basePath="/settings" />
        </Suspense>
      );
    }
    if (id === "aiCredits") {
      return <SettingsAiCreditsTab />;
    }
    return (
      <SettingsClient
        locale={locale}
        metaOAuthConfigured={metaOAuthConfigured}
        metaOAuthError={metaOAuthError}
        connectMetaSlot={connectMetaSlot}
        embedded
        bare
        activeTab={id as SettingsClientTab}
        onActiveTabChange={() => {}}
      />
    );
  }

  return (
    <DsFlatPanel>
      <DsPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        titleIcon={<SettingsIcon size={16} />}
      />

      <DsTabBar
        tabs={tabs}
        active={active}
        onChange={setActive}
        ariaLabel={t("title")}
        variant="underline"
        className="mb-6"
      />

      <div key={active} className="tab-transition animate-fade-up">
        {renderPanel(active)}
      </div>
    </DsFlatPanel>
  );
}
