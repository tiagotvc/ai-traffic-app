export const COMMANDER_NAV = {
  route: "/commander",
  navKey: "commander"
} as const;

export const COMMANDER_NAV_ITEMS = [
  { id: "overview", href: "/commander", navKey: "commanderNavOverview" },
  { id: "scientists", href: "/commander/scientists", navKey: "commanderNavScientists" },
  { id: "settings", href: "/commander/settings", navKey: "commanderNavSettings" }
] as const;

export type CommanderNavItemId = (typeof COMMANDER_NAV_ITEMS)[number]["id"];

export function isCommanderActive(base: string): boolean {
  return base === "/commander" || base.startsWith("/commander/");
}

export function isCommanderOverviewActive(base: string): boolean {
  return base === "/commander";
}

export function isCommanderScientistsActive(base: string): boolean {
  return base === "/commander/scientists" || base.startsWith("/commander/scientists/");
}

export function isCommanderSettingsActive(base: string): boolean {
  return base === "/commander/settings" || base.startsWith("/commander/settings/");
}
