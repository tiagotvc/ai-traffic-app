"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminCreatorShell } from "@/components/admin/AdminCreatorShell";
import { PageTabs } from "@/components/layout/PageTabs";
import {
  PLATFORM_ADMIN_LINKS,
  platformAdminHref,
  resolvePlatformAdminTab,
  type PlatformAdminTabId
} from "@/components/layout/admin-nav-links";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { usePathname, useRouter } from "@/i18n/navigation";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const tNav = useTranslations("nav");
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
    <AdminCreatorShell>
      <PageTitleBlock
        title={tNav("menuAdministrative")}
        titleIcon={<ShieldCheck size={16} />}
      />

      <PageTabs tabs={tabs} active={active} onChange={selectTab} accent="brand" className="mb-1" />

      {children}
    </AdminCreatorShell>
  );
}
