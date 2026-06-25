import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function viewEditorHref(appId: string, locale: AppLocale) {
  const path = getPathname({
    locale,
    href: `/dashboard/apps/${appId}`
  });
  return `${path}?edit=1`;
}

export function openViewEditor(appId: string, locale: AppLocale) {
  if (typeof window === "undefined") return;
  window.open(viewEditorHref(appId, locale), "_blank", "noopener,noreferrer");
}
