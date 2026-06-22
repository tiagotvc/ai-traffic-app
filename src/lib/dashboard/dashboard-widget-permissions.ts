import "server-only";

import type { Entitlements, PlanLimits } from "@/lib/billing/types";
import { isMasterBlasterWidgetType, MASTER_BLASTER_ADDON } from "@/lib/dashboard/master-blaster";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  basic: 1,
  advanced: 2,
  pro: 2,
  agency: 3,
  master: 4
};

export type WidgetPermissionOptions = {
  platformAdmin?: boolean;
};

export class DashboardCanvasForbiddenError extends Error {
  code = "DASHBOARD_CANVAS_FORBIDDEN" as const;
  constructor() {
    super("Dashboard canvas not available on your plan");
    this.name = "DashboardCanvasForbiddenError";
  }
}

export function assertDashboardCanvas(entitlements: Entitlements, options?: WidgetPermissionOptions): void {
  if (options?.platformAdmin) return;
  if (!entitlements.limits.allowDashboardCanvas) {
    throw new DashboardCanvasForbiddenError();
  }
}

export function planRank(slug: string): number {
  return PLAN_RANK[slug] ?? 0;
}

export function meetsMinPlan(currentSlug: string, minPlan?: string): boolean {
  if (!minPlan) return true;
  return planRank(currentSlug) >= planRank(minPlan);
}

export function canUseAiWidgets(
  limits: PlanLimits,
  tier: "basic" | "premium" | "advanced"
): boolean {
  const level = limits.allowDashboardAiWidgets;
  if (!level) return false;
  const rank: Record<string, number> = { basic: 1, premium: 2, advanced: 3 };
  return rank[level] >= rank[tier];
}

function hasAddon(activeAddons: string[], requiredAddon?: string): boolean {
  if (!requiredAddon) return true;
  return activeAddons.includes(requiredAddon);
}

export function assertDashboardWidget(
  entitlements: Entitlements,
  widgetType: string,
  activeAddons: string[] = [],
  options?: WidgetPermissionOptions
): void {
  assertDashboardCanvas(entitlements, options);
  if (options?.platformAdmin) return;

  const def = getWidgetDefinition(widgetType);
  if (!def) throw new Error(`Unknown widget type: ${widgetType}`);

  const isMasterBlaster = isMasterBlasterWidgetType(widgetType) || def.requiredAddon === MASTER_BLASTER_ADDON;

  if (def.comingSoon && !isMasterBlaster) {
    throw new Error("Widget not available yet");
  }

  if (isMasterBlaster) {
    if (!hasAddon(activeAddons, MASTER_BLASTER_ADDON)) {
      throw new Error("Widget requires Master Blaster add-on");
    }
    return;
  }

  if (def.minPlan && !meetsMinPlan(entitlements.planSlug, def.minPlan)) {
    throw new Error("Widget requires a higher plan");
  }
  if (def.requiredAddon && !hasAddon(activeAddons, def.requiredAddon)) {
    throw new Error("Widget requires an add-on");
  }
  if (def.isAiWidget && !canUseAiWidgets(entitlements.limits, "basic")) {
    throw new Error("AI widgets not available on your plan");
  }
  if (def.isAiWidget && def.minPlan === "agency" && !canUseAiWidgets(entitlements.limits, "premium")) {
    throw new Error("Premium AI widgets require Agency plan");
  }
}

export function isWidgetAllowedForPlan(
  entitlements: Entitlements,
  widgetType: string,
  activeAddons: string[] = [],
  options?: WidgetPermissionOptions
): boolean {
  try {
    assertDashboardWidget(entitlements, widgetType, activeAddons, options);
    return true;
  } catch {
    return false;
  }
}

export function maxDashboardsForPlan(limits: PlanLimits): number {
  if (!limits.allowDashboardCanvas) return 0;
  if (limits.maxDashboards < 0) return Infinity;
  return limits.maxDashboards;
}

export function maxWidgetsForPlan(limits: PlanLimits): number {
  if (!limits.allowDashboardCanvas) return 0;
  if (limits.maxDashboardWidgets < 0) return Infinity;
  return limits.maxDashboardWidgets;
}
