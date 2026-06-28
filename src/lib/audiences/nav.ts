export const AUDIENCES_NAV = {
  route: "/audiences/personas",
  navKey: "audiences"
} as const;

export const AUDIENCES_NAV_ITEMS = [
  { id: "personas", href: "/audiences/personas", navKey: "audiencesNavPersonas" },
  { id: "zones", href: "/audiences/zones", navKey: "audiencesNavZones" },
  { id: "meta", href: "/audiences/meta", navKey: "audiencesNavMeta" }
] as const;

export type AudiencesNavItemId = (typeof AUDIENCES_NAV_ITEMS)[number]["id"];

export function isAudiencesActive(base: string): boolean {
  return base === "/audiences" || base.startsWith("/audiences/");
}

export function isAudiencesPersonasActive(base: string): boolean {
  return base === "/audiences/personas" || base.startsWith("/audiences/personas/");
}

export function isAudiencesZonesActive(base: string): boolean {
  return base === "/audiences/zones" || base.startsWith("/audiences/zones/");
}

export function isAudiencesMetaActive(base: string): boolean {
  return base === "/audiences/meta" || base.startsWith("/audiences/meta/");
}
