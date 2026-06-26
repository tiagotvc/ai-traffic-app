export const PLATFORM_ADMIN_LINKS = [
  { id: "users", href: "/admin/users", labelKey: "navUsers" as const },
  { id: "plans", href: "/admin/billing/plans", labelKey: "navPlans" as const },
  { id: "finance", href: "/admin/billing/finance", labelKey: "navFinance" as const },
  { id: "coupons", href: "/admin/billing/coupons", labelKey: "navCoupons" as const },
  { id: "refunds", href: "/admin/billing/refunds", labelKey: "navRefunds" as const },
  { id: "contacts", href: "/admin/contacts", labelKey: "navContacts" as const },
  { id: "featureFlags", href: "/admin/platform/feature-flags", labelKey: "navFeatureFlags" as const },
  { id: "theme", href: "/admin/platform/theme", labelKey: "navTheme" as const }
] as const;

export type PlatformAdminTabId = (typeof PLATFORM_ADMIN_LINKS)[number]["id"];

export function isPlatformAdminLinkActive(pathname: string, href: string): boolean {
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  if (href === "/admin/users") return base.startsWith("/admin/users");
  return base === href || base.startsWith(`${href}/`);
}

export function resolvePlatformAdminTab(pathname: string): PlatformAdminTabId {
  for (const link of PLATFORM_ADMIN_LINKS) {
    if (isPlatformAdminLinkActive(pathname, link.href)) return link.id;
  }
  return "users";
}

export function platformAdminHref(tabId: PlatformAdminTabId): string {
  return PLATFORM_ADMIN_LINKS.find((l) => l.id === tabId)?.href ?? "/admin/users";
}
