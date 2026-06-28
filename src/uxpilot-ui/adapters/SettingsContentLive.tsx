"use client";

import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Database,
  Plug,
  Sparkles,
  User,
  Users,
  type LucideIcon
} from "lucide-react";

import { BillingPortalClient } from "@/components/billing/BillingPortalClient";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";
import { SettingsClient } from "@/components/SettingsClient";
import { SettingsAiCreditsTab } from "@/components/settings/SettingsAiCreditsTab";
import { AdvancedToolsPanel } from "@/components/settings/AdvancedToolsPanel";
import {
  SettingsSectionNav,
  type SettingsNavItem
} from "@/components/settings/SettingsSectionNav";
import { DsFlatPanel, PageTitleBlock } from "@/design-system";
import type { Entitlements } from "@/lib/billing/types";

type TabId = "account" | "plan" | "aiCredits" | "integrations" | "team" | "data";
type SettingsClientTab = "account" | "integrations" | "team" | "data";

const VALID_TABS: TabId[] = [
  "account",
  "plan",
  "aiCredits",
  "integrations",
  "team",
  "data"
];

const LEGACY_PLAN_SECTIONS = new Set(["limits", "billing", "events"]);

function parseTab(raw: string | null): TabId {
  if (raw === "general" || raw === "branding") return "account";
  if (raw && LEGACY_PLAN_SECTIONS.has(raw)) return "plan";
  if (raw && VALID_TABS.includes(raw as TabId)) return raw as TabId;
  return "account";
}

const TAB_ICONS: Record<TabId, LucideIcon> = {
  account: User,
  plan: CreditCard,
  aiCredits: Sparkles,
  integrations: Plug,
  team: Users,
  data: Database
};

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = parseTab(searchParams.get("tab"));
  const [active, setActive] = useState<TabId>(initialTab);
  const [allowWhiteLabel, setAllowWhiteLabel] = useState(false);

  useEffect(() => {
    setActive(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/me/entitlements")
      .then((r) => r.json())
      .then((j) => {
        const entitlements = j.entitlements as Entitlements | undefined;
        setAllowWhiteLabel(Boolean(entitlements?.limits?.allowWhiteLabel));
      })
      .catch(() => setAllowWhiteLabel(false));
  }, []);

  const selectTab = useCallback(
    (tab: TabId) => {
      setActive(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      if (tab !== "plan") {
        params.delete("section");
        params.delete("invoice");
      }
      router.replace(`/settings?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const navItems = useMemo((): SettingsNavItem<TabId>[] => {
    const items: SettingsNavItem<TabId>[] = [
      {
        value: "account",
        label: t("navAccountTitle"),
        description: t("navAccountDesc"),
        icon: TAB_ICONS.account
      },
      {
        value: "plan",
        label: t("navPlanTitle"),
        description: t("navPlanDesc"),
        icon: TAB_ICONS.plan
      },
      {
        value: "aiCredits",
        label: t("navAiCreditsTitle"),
        description: t("navAiCreditsDesc"),
        icon: TAB_ICONS.aiCredits
      },
      {
        value: "integrations",
        label: t("navIntegrationsTitle"),
        description: t("navIntegrationsDesc"),
        icon: TAB_ICONS.integrations
      },
      {
        value: "team",
        label: t("navTeamTitle"),
        description: t("navTeamDesc"),
        icon: TAB_ICONS.team
      },
      {
        value: "data",
        label: t("navDataTitle"),
        description: t("navDataDesc"),
        icon: TAB_ICONS.data
      }
    ];
    return items;
  }, [t]);

  const pageMeta = useMemo(() => {
    const icon = TAB_ICONS[active];
    const Icon = icon;
    const titles: Record<TabId, { title: string; subtitle: string }> = {
      account: { title: t("pageAccountTitle"), subtitle: t("pageAccountSubtitle") },
      plan: { title: t("pagePlanTitle"), subtitle: tBilling("portalSubtitle") },
      aiCredits: { title: t("pageAiCreditsTitle"), subtitle: tAi("pageSubtitle") },
      integrations: {
        title: t("integrationsPageTitle"),
        subtitle: t("integrationsPageSubtitle")
      },
      team: { title: t("pageTeamTitle"), subtitle: t("pageTeamSubtitle") },
      data: { title: t("pageDataTitle"), subtitle: t("pageDataSubtitle") }
    };
    return {
      ...titles[active],
      titleIcon: <Icon size={16} aria-hidden />
    };
  }, [active, t, tBilling, tAi]);

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
      <>
        <SettingsClient
          locale={locale}
          metaOAuthConfigured={metaOAuthConfigured}
          metaOAuthError={metaOAuthError}
          connectMetaSlot={connectMetaSlot}
          embedded
          bare
          activeTab={id as SettingsClientTab}
          onActiveTabChange={() => {}}
          allowWhiteLabel={allowWhiteLabel}
        />
        {id === "integrations" ? <AdvancedToolsPanel /> : null}
      </>
    );
  }

  return (
    <DsFlatPanel>
      <PageTitleBlock
        className="mb-6"
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        titleIcon={pageMeta.titleIcon}
      />

      <div className="settings-layout flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="settings-layout__nav w-full shrink-0 lg:w-52 xl:w-56">
          <SettingsSectionNav
            items={navItems}
            active={active}
            onChange={selectTab}
            ariaLabel={t("title")}
          />
        </aside>

        <div className="settings-layout__content min-w-0 flex-1">
          <div key={active} className="tab-transition animate-fade-up">
            {renderPanel(active)}
          </div>
        </div>
      </div>
    </DsFlatPanel>
  );
}
