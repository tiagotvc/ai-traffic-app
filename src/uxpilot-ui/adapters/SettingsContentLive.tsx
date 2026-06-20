"use client";

import type { ReactNode } from "react";
import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Settings as SettingsIcon,
  Bell,
  Users,
  Palette,
  Shield,
  Zap,
  CreditCard,
  type LucideIcon
} from "lucide-react";

import { BillingPortalClient } from "@/components/billing/BillingPortalClient";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";
import { SettingsClient } from "@/components/SettingsClient";
import SettingsContent from "@/uxpilot-ui/pages/content/Settings";

const SECTION_TO_TAB = {
  general: "general",
  integrations: "integrations",
  team: "team",
  security: "data"
} as const;

type LiveSection = keyof typeof SECTION_TO_TAB | "notifications" | "appearance" | "plan";

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
  const tBilling = useTranslations("billingPage");
  const [activeSection, setActiveSection] = useState<string>("general");

  const extraSections: Array<{ id: string; label: string; icon: LucideIcon }> = [
    { id: "plan", label: tBilling("tabPlan"), icon: CreditCard }
  ];

  function renderPanel(sectionId: string): ReactNode | undefined {
    if (sectionId === "plan") {
      return (
        <Suspense fallback={<BillingPortalSkeleton />}>
          <BillingPortalClient embedded basePath="/settings" activeTab="plan" />
        </Suspense>
      );
    }
    const tab = SECTION_TO_TAB[sectionId as keyof typeof SECTION_TO_TAB];
    if (!tab) return undefined;
    return (
      <SettingsClient
        locale={locale}
        metaOAuthConfigured={metaOAuthConfigured}
        metaOAuthError={metaOAuthError}
        connectMetaSlot={connectMetaSlot}
        embedded
        bare
        activeTab={tab}
        onActiveTabChange={() => {}}
      />
    );
  }

  return (
    <SettingsContent
      live={{
        activeSection,
        onSectionChange: setActiveSection,
        renderPanel,
        extraSections
      }}
    />
  );
}
