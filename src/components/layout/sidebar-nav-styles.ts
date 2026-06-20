export const SIDEBAR_NAV = {
  itemActive: "sidebar-item-active font-semibold",
  itemIdle: "sidebar-item-idle font-medium",
  subActive: "sidebar-sub-active",
  subIdle: "sidebar-sub-idle"
} as const;

export const SIDEBAR_MODULE_ACCENTS = {
  pink: {
    active: "font-semibold text-pink-300",
    idle: "text-pink-400/90 hover:text-pink-300"
  }
} as const;

export type SidebarModuleAccent = keyof typeof SIDEBAR_MODULE_ACCENTS;

export function sidebarItemClasses(active: boolean, collapsed?: boolean): string {
  const base = `relative flex w-full items-center rounded-lg transition-all duration-200 ${
    collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5 text-[13px]"
  }`;
  return `${base} ${active ? SIDEBAR_NAV.itemActive : SIDEBAR_NAV.itemIdle}`;
}

export function sidebarSubLinkClasses(active: boolean): string {
  return `block rounded-lg px-3 py-1.5 text-[12px] transition ${
    active ? SIDEBAR_NAV.subActive : SIDEBAR_NAV.subIdle
  }`;
}

export function sidebarModuleClasses(
  accent: SidebarModuleAccent | undefined,
  active: boolean
): string {
  const state = active
    ? accent
      ? SIDEBAR_MODULE_ACCENTS[accent].active
      : SIDEBAR_NAV.subActive
    : accent
      ? SIDEBAR_MODULE_ACCENTS[accent].idle
      : SIDEBAR_NAV.subIdle;
  return `block rounded-lg px-3 py-1.5 text-[12px] transition ${state}`;
}
