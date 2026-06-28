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

export function resolveMetaAdsConsultedCount(insight: CreatorBrainInsightPayload): number {
  return insight.metaAdsConsultedCount ?? insight.metaCompetitorAdCount ?? 0;
}

export function resolveMetaResearchStep(
  insight: CreatorBrainInsightPayload
): CreatorBrainResearchStep | undefined {
  return resolveResearchSteps(insight).find((s) => s.step === "meta_competitor_search");
}

/** True when Meta Ad Library HTTP was invoked (not skipped / legacy cache). */
export function wasMetaResearchAttempted(step: CreatorBrainResearchStep | undefined): boolean {
  if (!step) return false;
  if (step.detail === "api_not_configured" || step.detail === "legacy_cache") return false;
  return step.status === "done" || step.status === "fallback";
}

export type ConsultationCounts = {
  clientSynced: number;
  agencySynced: number;
  agencyMatched: number;
  metaAds: number;
  /** Matched samples used for metrics (client + agency). */
  matchedSamples: number;
};

export function resolveConsultationCounts(insight: CreatorBrainInsightPayload): ConsultationCounts {
  const steps = resolveResearchSteps(insight);
  const clientSynced =
    insight.clientSyncedCampaignCount ?? getResearchStepCount(steps, "client_campaigns");
  const agencySynced =
    insight.agencySyncedCampaignCount ?? getResearchStepCount(steps, "agency_search");
  const agencyMatched = getResearchStepCount(steps, "agency_matched");
  const matchedSamples = resolveTotalSampleCount(insight);
  const metaAds = resolveMetaAdsConsultedCount(insight);

  return { clientSynced, agencySynced, agencyMatched, metaAds, matchedSamples };
}

/** Synced Meta campaigns consulted (client + agency pool). */
export function resolveSyncedCampaignsCount(insight: CreatorBrainInsightPayload): number {
  const { clientSynced, agencyMatched, agencySynced, matchedSamples } = resolveConsultationCounts(insight);
  if (matchedSamples > 0) return matchedSamples;
  if (clientSynced > 0 && agencyMatched > 0) return clientSynced + agencyMatched;
  if (clientSynced > 0) return clientSynced;
  if (agencyMatched > 0) return agencyMatched;
  if (agencySynced > 0) return agencySynced;
  return 0;
}

/** Sidebar badge: synced campaigns, or Meta ads when only Ad Library was queried. */
export function resolveConsultedCampaignsCount(insight: CreatorBrainInsightPayload): number {
  const synced = resolveSyncedCampaignsCount(insight);
  if (synced > 0) return synced;

  const steps = resolveResearchSteps(insight);
  const metaStep = steps.find((s) => s.step === "meta_competitor_search");
  const metaApiCalled = metaStep?.status === "done" || metaStep?.status === "fallback";
  const metaAds = resolveMetaAdsConsultedCount(insight);

  if (metaApiCalled && metaAds > 0) return metaAds;
  return 0;
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
  const { clientSynced, agencySynced, metaAds } = resolveConsultationCounts(insight);
  const matchedSamples = resolveTotalSampleCount(insight);
  if (matchedSamples > 0) return false;
  return agencySynced === 0 && clientSynced === 0 && metaAds === 0;
}

export function filterCardResearchSteps(steps: CreatorBrainResearchStep[]): CreatorBrainResearchStep[] {
  return normalizeResearchSteps(steps);
}

/** Modal timeline: done steps, agency search, meta search (incl. skipped), and benchmark fallback only. */
export function filterHighlightResearchSteps(steps: CreatorBrainResearchStep[]): CreatorBrainResearchStep[] {
  return filterCardResearchSteps(steps).filter(
    (step) =>
      step.status === "fallback" ||
      step.step === "agency_search" ||
      step.step === "meta_competitor_search" ||
      (step.status === "done" && ((step.count ?? 0) > 0 || step.step === "metrics_computed"))
  );
}
