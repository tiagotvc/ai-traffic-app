import type { AgencyBrainModuleMeta } from "@/lib/agency-brain/domain/modules";
import {
  AGENCY_BRAIN_MODULE_REGISTRY,
  isAgencyBrainModuleEnabled,
  resolveAgencyBrainFeatures,
  type AgencyBrainFeatureFlags
} from "@/lib/agency-brain/domain/modules";
import type { PlanLimitKey, PlanLimits } from "@/lib/billing/types";

/** Main sidebar items gated by plan (always-visible items omitted). */
export type GatedNavId =
  | "campaigns"
  | "audiences"
  | "creatives"
  | "reports"
  | "alerts"
  | "automations"
  | "agencyBrain";

const NAV_LIMIT_KEY: Record<GatedNavId, PlanLimitKey> = {
  campaigns: "allowNavCampaigns",
  audiences: "allowNavAudiences",
  creatives: "allowNavCreatives",
  reports: "allowNavReports",
  alerts: "allowNavAlerts",
  automations: "allowNavAutomations",
  agencyBrain: "allowCreativeMemoryAi"
};

const NAV_HREF: Record<GatedNavId, string> = {
  campaigns: "/campaigns",
  audiences: "/audiences",
  creatives: "/creatives",
  reports: "/reports",
  alerts: "/alerts",
  automations: "/automations",
  agencyBrain: "/agency-brain/learnings"
};

export function isNavItemAllowed(navId: GatedNavId, limits: PlanLimits): boolean {
  const key = NAV_LIMIT_KEY[navId];
  return Boolean(limits[key]);
}

export function navItemHref(navId: GatedNavId): string {
  return NAV_HREF[navId];
}

export function agencyBrainModuleAllowed(
  mod: AgencyBrainModuleMeta,
  features: AgencyBrainFeatureFlags
): boolean {
  if (!features.allowCreativeMemoryAi) return false;
  return isAgencyBrainModuleEnabled(mod, features);
}

export function allAgencyBrainModulesForNav(features: AgencyBrainFeatureFlags): AgencyBrainModuleMeta[] {
  const resolved = resolveAgencyBrainFeatures(features);
  if (!resolved.allowCreativeMemoryAi) return [];
  return AGENCY_BRAIN_MODULE_REGISTRY;
}
