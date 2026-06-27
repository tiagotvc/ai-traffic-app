import type {
  CreatorBrainInsightPayload,
  CreatorBrainResearchStep
} from "@/lib/campaign-creator/creator-brain-insights";

export const BRAIN_PAUSED_KEY = "orion-creator-brain-paused";

export function resolveTotalSampleCount(insight: CreatorBrainInsightPayload): number {
  if (insight.totalSampleCount > 0) return insight.totalSampleCount;
  return insight.similarCampaignCount + (insight.agencySampleCount ?? 0);
}

export function resolveAgencyScannedCount(insight: CreatorBrainInsightPayload): number {
  return getResearchStepCount(resolveResearchSteps(insight), "agency_search");
}

/** Campaigns consulted for the sidebar badge (matched samples, else agency/client scan totals). */
export function resolveConsultedCampaignsCount(insight: CreatorBrainInsightPayload): number {
  const totalSampleCount = resolveTotalSampleCount(insight);
  if (totalSampleCount > 0) return totalSampleCount;

  const steps = resolveResearchSteps(insight);
  const agencyScanned = getResearchStepCount(steps, "agency_search");
  if (agencyScanned > 0) return agencyScanned;

  return getResearchStepCount(steps, "client_campaigns");
}

/** Ensures modal timeline steps exist; backfills meta search for older payloads. */
export function normalizeResearchSteps(steps: CreatorBrainResearchStep[]): CreatorBrainResearchStep[] {
  const merged = steps.some((step) => step.step === "meta_competitor_search")
    ? steps
    : [
        ...steps,
        {
          step: "meta_competitor_search" as const,
          status: "skipped" as const,
          detail: "legacy_cache"
        }
      ];

  return ORION_CARD_RESEARCH_STEPS.map((stepKey) => merged.find((step) => step.step === stepKey)).filter(
    (step): step is CreatorBrainResearchStep => step != null
  );
}

export function resolveResearchSteps(insight: CreatorBrainInsightPayload): CreatorBrainResearchStep[] {
  const raw = insight.researchSteps ?? insight.researchLog ?? [];
  return normalizeResearchSteps(raw);
}

export function isBenchmarkOnly(insight: CreatorBrainInsightPayload): boolean {
  const totalSampleCount = resolveTotalSampleCount(insight);
  return Boolean(
    insight.usesBenchmark && totalSampleCount === 0 && insight.insightVariant === "benchmark_reference"
  );
}

/** Research steps shown in the detail modal timeline. */
export const ORION_CARD_RESEARCH_STEPS: CreatorBrainResearchStep["step"][] = [
  "client_campaigns",
  "agency_search",
  "agency_matched",
  "meta_competitor_search",
  "metrics_computed",
  "benchmark"
];

export function getResearchStepCount(
  steps: CreatorBrainResearchStep[],
  step: CreatorBrainResearchStep["step"]
): number {
  return steps.find((s) => s.step === step)?.count ?? 0;
}

/** Generic benchmark copy only when no synced campaigns were consulted at all. */
export function shouldShowBenchmarkFallbackMessage(insight: CreatorBrainInsightPayload): boolean {
  const totalSampleCount = resolveTotalSampleCount(insight);
  if (totalSampleCount > 0) return false;

  const steps = resolveResearchSteps(insight);
  const agencyScanned = getResearchStepCount(steps, "agency_search");
  const clientCount = getResearchStepCount(steps, "client_campaigns");

  return agencyScanned === 0 && clientCount === 0;
}

export function filterCardResearchSteps(steps: CreatorBrainResearchStep[]): CreatorBrainResearchStep[] {
  return normalizeResearchSteps(steps);
}

/** Modal timeline: done steps, agency search, meta search, and benchmark fallback only. */
export function filterHighlightResearchSteps(steps: CreatorBrainResearchStep[]): CreatorBrainResearchStep[] {
  return filterCardResearchSteps(steps).filter(
    (step) =>
      step.status === "fallback" ||
      step.step === "agency_search" ||
      step.step === "meta_competitor_search" ||
      (step.status === "done" && ((step.count ?? 0) > 0 || step.step === "metrics_computed"))
  );
}
