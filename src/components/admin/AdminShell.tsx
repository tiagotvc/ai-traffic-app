"use client";

import { useTranslations } from "next-intl";

import { PageTabs } from "@/components/layout/PageTabs";
import {
  PLATFORM_ADMIN_LINKS,
  platformAdminHref,
  resolvePlatformAdminTab,
  type PlatformAdminTabId
} from "@/components/layout/admin-nav-links";
import { usePathname, useRouter } from "@/i18n/navigation";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("billingAdmin");
  const pathname = usePathname();
  const router = useRouter();
  const active = resolvePlatformAdminTab(pathname);

  const tabs = PLATFORM_ADMIN_LINKS.map((link) => ({
    key: link.id,
    label: t(link.labelKey)
  }));

  function selectTab(tabId: PlatformAdminTabId) {
    if (tabId === active) return;
    router.push(platformAdminHref(tabId));
  }

  return (
    <div className="w-full space-y-4">
      <PageTabs tabs={tabs} active={active} onChange={selectTab} accent="brand" />
      {children}
    </div>
  );
}
