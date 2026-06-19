/** Agency Brain module identifiers — used in routes, sidebar, feature flags */
export const AGENCY_BRAIN_MODULES = [
  "learnings",
  "hypotheses",
  "suggestions",
  "dna",
  "timeline",
  "experiments",
  "labs",
  "action-plans",
  "chat"
] as const;

export type AgencyBrainModule = (typeof AGENCY_BRAIN_MODULES)[number];

export type AgencyBrainNavPillar = "memory" | "actions" | "analysis";

export type AgencyBrainModuleMeta = {
  id: AgencyBrainModule;
  route: string;
  navKey: string;
  navPillar: AgencyBrainNavPillar;
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  featureFlag?: keyof AgencyBrainFeatureFlags;
  navAccent?: "pink";
  /** Visible in nav but not navigable (future release). */
  comingSoon?: boolean;
  /** Shown in MVP sidebar (single-link mode hides modules with false). */
  mvpVisible?: boolean;
};

/** MVP sidebar: learnings + hypotheses submenus. */
export const AGENCY_BRAIN_MVP_NAV_ITEMS = [
  {
    id: "learnings" as const,
    navKey: "agencyBrainLearnings",
    href: "/agency-brain"
  },
  {
    id: "hypotheses" as const,
    navKey: "agencyBrainHypotheses",
    href: "/agency-brain/hypotheses"
  }
];

/** MVP sidebar parent entry. */
export const AGENCY_BRAIN_MVP_NAV = {
  route: "/agency-brain",
  navKey: "agencyBrainInsights"
} as const;

export type AgencyBrainFeatureFlags = {
  allowCreativeMemoryAi: boolean;
  allowAgencyBrainHypotheses: boolean;
  allowAgencyBrainDna: boolean;
  allowAgencyBrainTimeline: boolean;
  allowAgencyBrainExperiments: boolean;
  allowAgencyBrainActionPlans: boolean;
  allowAgencyBrainChat: boolean;
};

export const AGENCY_BRAIN_NAV_PILLARS: AgencyBrainNavPillar[] = ["memory", "actions", "analysis"];

export const AGENCY_BRAIN_MODULE_REGISTRY: AgencyBrainModuleMeta[] = [
  {
    id: "learnings",
    route: "/agency-brain/learnings",
    navKey: "agencyBrainLearnings",
    navPillar: "memory",
    phase: 1,
    mvpVisible: false
  },
  {
    id: "hypotheses",
    route: "/agency-brain/hypotheses",
    navKey: "agencyBrainHypotheses",
    navPillar: "memory",
    phase: 1,
    featureFlag: "allowAgencyBrainHypotheses",
    mvpVisible: false
  },
  {
    id: "dna",
    route: "/agency-brain/dna",
    navKey: "agencyBrainDna",
    navPillar: "memory",
    phase: 1,
    featureFlag: "allowAgencyBrainDna",
    mvpVisible: false
  },
  {
    id: "suggestions",
    route: "/agency-brain/suggestions",
    navKey: "agencyBrainActionCenter",
    navPillar: "actions",
    phase: 1,
    mvpVisible: false
  },
  {
    id: "action-plans",
    route: "/agency-brain/action-plans",
    navKey: "agencyBrainActionPlans",
    navPillar: "actions",
    phase: 4,
    featureFlag: "allowAgencyBrainActionPlans",
    comingSoon: true,
    mvpVisible: false
  },
  {
    id: "timeline",
    route: "/agency-brain/timeline",
    navKey: "agencyBrainTimeline",
    navPillar: "analysis",
    phase: 2,
    featureFlag: "allowAgencyBrainTimeline",
    comingSoon: true,
    mvpVisible: false
  },
  {
    id: "labs",
    route: "/agency-brain/labs",
    navKey: "agencyBrainLabs",
    navPillar: "analysis",
    phase: 3,
    featureFlag: "allowAgencyBrainExperiments",
    navAccent: "pink",
    comingSoon: true,
    mvpVisible: false
  },
  {
    id: "chat",
    route: "/agency-brain/chat",
    navKey: "agencyBrainChat",
    navPillar: "analysis",
    phase: 5,
    featureFlag: "allowAgencyBrainChat",
    comingSoon: true,
    mvpVisible: false
  }
];

export function resolveAgencyBrainFeatures(limits: {
  allowCreativeMemoryAi?: boolean;
  allowAgencyBrainHypotheses?: boolean;
  allowAgencyBrainDna?: boolean;
  allowAgencyBrainTimeline?: boolean;
  allowAgencyBrainExperiments?: boolean;
  allowAgencyBrainActionPlans?: boolean;
  allowAgencyBrainChat?: boolean;
}): AgencyBrainFeatureFlags {
  const base = limits.allowCreativeMemoryAi ?? true;
  return {
    allowCreativeMemoryAi: base,
    allowAgencyBrainHypotheses: limits.allowAgencyBrainHypotheses ?? base,
    allowAgencyBrainDna: limits.allowAgencyBrainDna ?? base,
    allowAgencyBrainTimeline: limits.allowAgencyBrainTimeline ?? false,
    allowAgencyBrainExperiments: limits.allowAgencyBrainExperiments ?? false,
    allowAgencyBrainActionPlans: limits.allowAgencyBrainActionPlans ?? false,
    allowAgencyBrainChat: limits.allowAgencyBrainChat ?? false
  };
}

export function isAgencyBrainModuleEnabled(
  module: AgencyBrainModuleMeta,
  features: AgencyBrainFeatureFlags
): boolean {
  if (!features.allowCreativeMemoryAi) return false;
  if (!module.featureFlag) return true;
  return features[module.featureFlag];
}
