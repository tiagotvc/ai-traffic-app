import { routing, type AppLocale } from "@/i18n/routing";

export function getLocaleFromPath(pathname: string): AppLocale {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (routing.locales.includes(seg as AppLocale)) return seg as AppLocale;
  return routing.defaultLocale;
}

export function stripLocale(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  const prefix = `/${locale}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length) || "/";
  return pathname;
}
