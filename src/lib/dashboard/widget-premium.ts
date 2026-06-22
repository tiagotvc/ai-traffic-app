import { MASTER_BLASTER_ADDON, isMasterBlasterWidgetType } from "@/lib/dashboard/master-blaster";

export type CatalogWidgetPremiumMeta = {
  type: string;
  allowed: boolean;
  comingSoon?: boolean;
  minPlan?: string;
  requiredAddon?: string;
  isAiWidget?: boolean;
  category?: string;
};

export type PremiumBadgeKind = "masterBlaster" | "addon" | "ai";

export function isPremiumTierWidget(w: CatalogWidgetPremiumMeta): boolean {
  if (w.requiredAddon === MASTER_BLASTER_ADDON) return true;
  if (isMasterBlasterWidgetType(w.type)) return true;
  if (w.category === "premium") return true;
  return false;
}

export function filterPremiumCatalog<T extends CatalogWidgetPremiumMeta>(widgets: T[]): T[] {
  return widgets.filter(isPremiumTierWidget);
}

export function getPremiumBadge(w: CatalogWidgetPremiumMeta): PremiumBadgeKind | null {
  if (!isPremiumTierWidget(w)) return null;
  if (w.requiredAddon === MASTER_BLASTER_ADDON || isMasterBlasterWidgetType(w.type)) {
    return "masterBlaster";
  }
  if (w.requiredAddon) return "addon";
  if (w.isAiWidget) return "ai";
  return "masterBlaster";
}

export function premiumBadgeLabelKey(badge: PremiumBadgeKind): string {
  switch (badge) {
    case "masterBlaster":
      return "premiumBadgeMasterBlaster";
    case "addon":
      return "premiumBadgeAddon";
    case "ai":
      return "premiumBadgeAi";
  }
}
