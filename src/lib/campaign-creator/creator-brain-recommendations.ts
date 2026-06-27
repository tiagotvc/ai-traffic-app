import type { CampaignObjectiveKey, CreatorNode } from "@/lib/campaign-draft";
import type {
  CreatorBrainInsightPayload,
  CreatorBrainMetric
} from "@/lib/campaign-creator/creator-brain-insights";
import {
  getResearchStepCount,
  resolveResearchSteps,
  resolveTotalSampleCount
} from "@/lib/campaign-creator/orion-brain-utils";

export type CreatorBrainRecommendation = {
  key: string;
  params?: Record<string, string | number>;
};

export type CreatorBrainDraftContext = {
  hasClient: boolean;
  dailyBudgetBRL?: number;
  activeNode?: CreatorNode;
};

function metricUsesCpc(metric: CreatorBrainMetric): boolean {
  return metric === "cpc";
}

function pushUnique(
  list: CreatorBrainRecommendation[],
  seen: Set<string>,
  rec: CreatorBrainRecommendation
) {
  if (seen.has(rec.key)) return;
  seen.add(rec.key);
  list.push(rec);
}

function objectiveRecommendations(objective: CampaignObjectiveKey): CreatorBrainRecommendation[] {
  switch (objective) {
    case "awareness":
      return [
        { key: "brainRecAwarenessReach" },
        { key: "brainRecAwarenessCreative" },
        { key: "brainRecAwarenessPlacements" }
      ];
    case "traffic":
      return [{ key: "brainRecTrafficLanding" }, { key: "brainRecTrafficAudienceTest" }];
    case "engagement":
      return [{ key: "brainRecEngagementVideo" }, { key: "brainRecEngagementCommunity" }];
    case "leads":
      return [{ key: "brainRecLeadsForm" }, { key: "brainRecLeadsFollowUp" }];
    case "sales":
      return [{ key: "brainRecSalesPixel" }, { key: "brainRecSalesCatalog" }];
    case "app":
      return [{ key: "brainRecAppEvent" }, { key: "brainRecAppCreative" }];
    default:
      return [];
  }
}

function budgetRecommendations(input: {
  metric: CreatorBrainMetric;
  dailyBudgetBRL: number;
  anchorValue: number;
}): CreatorBrainRecommendation[] {
  const { metric, dailyBudgetBRL, anchorValue } = input;
  if (anchorValue <= 0 || dailyBudgetBRL <= 0) return [];

  if (metricUsesCpc(metric)) {
    const expectedClicks = Math.floor(dailyBudgetBRL / anchorValue);
    const minBudget = Math.ceil(anchorValue * 50);
    if (expectedClicks < 50) {
      return [
        {
          key: "brainRecBudgetLowForCpc",
          params: {
            budget: dailyBudgetBRL,
            cpc: Number(anchorValue.toFixed(2)),
            clicks: expectedClicks,
            minBudget
          }
        }
      ];
    }
    return [
      {
        key: "brainRecBudgetHealthyCpc",
        params: {
          budget: dailyBudgetBRL,
          cpc: Number(anchorValue.toFixed(2)),
          clicks: expectedClicks
        }
      }
    ];
  }

  const expectedConversions = dailyBudgetBRL / anchorValue;
  const minBudget = Math.ceil(anchorValue * 5);
  if (expectedConversions < 1) {
    return [
      {
        key: "brainRecBudgetLowForCpa",
        params: {
          budget: dailyBudgetBRL,
          cpa: Number(anchorValue.toFixed(2)),
          minBudget
        }
      }
    ];
  }
  return [
    {
      key: "brainRecBudgetHealthyCpa",
      params: {
        budget: dailyBudgetBRL,
        cpa: Number(anchorValue.toFixed(2)),
        conversions: Number(expectedConversions.toFixed(1))
      }
    }
  ];
}

function dataQualityRecommendations(
  insight: CreatorBrainInsightPayload,
  draft: CreatorBrainDraftContext | undefined
): CreatorBrainRecommendation[] {
  const recs: CreatorBrainRecommendation[] = [];
  const steps = resolveResearchSteps(insight);
  const totalSampleCount = resolveTotalSampleCount(insight);
  const agencyScanned = getResearchStepCount(steps, "agency_search");
  const agencyMatched = insight.agencySampleCount ?? getResearchStepCount(steps, "agency_matched");
  const clientCount = insight.similarCampaignCount ?? getResearchStepCount(steps, "client_campaigns");
  const metaStep = steps.find((s) => s.step === "meta_competitor_search");

  if (!draft?.hasClient) {
    recs.push({ key: "brainRecSelectClient" });
  }

  if (insight.confidence <= 55) {
    recs.push({ key: "brainRecLowConfidence", params: { confidence: insight.confidence } });
  }

  if (insight.usesBenchmark && totalSampleCount === 0) {
    recs.push({ key: "brainRecBenchmarkImproveData" });
    if (agencyScanned > 0 && agencyMatched === 0) {
      recs.push({
        key: "brainRecAgencyNoObjectiveMatch",
        params: { scanned: agencyScanned }
      });
    }
  } else if (agencyScanned > 0 && agencyMatched === 0) {
    recs.push({
      key: "brainRecAgencyNoObjectiveMatch",
      params: { scanned: agencyScanned }
    });
  }

  if (draft?.hasClient && clientCount === 0 && insight.dataLayers?.client === false) {
    recs.push({ key: "brainRecSyncClientCampaigns" });
  }

  if (metaStep?.detail === "no_competitors" && draft?.hasClient) {
    recs.push({ key: "brainRecAddCompetitors" });
  }

  if (insight.usesBenchmark && agencyScanned > 0 && totalSampleCount === 0) {
    recs.push({ key: "brainRecLabelCampaignObjective" });
  }

  return recs;
}

function performanceRecommendations(insight: CreatorBrainInsightPayload): CreatorBrainRecommendation[] {
  const recs: CreatorBrainRecommendation[] = [];

  if (
    insight.insightVariant === "client_beats_agency" &&
    insight.improvementPct != null &&
    insight.improvementPct >= 8
  ) {
    recs.push({
      key: "brainRecClientBeatsAgency",
      params: { pct: Math.round(insight.improvementPct) }
    });
  }

  if (insight.referenceCampaignName && insight.similarCampaignCount > 0) {
    recs.push({
      key: "brainRecReplicateBestCampaign",
      params: { name: insight.referenceCampaignName }
    });
  }

  if (
    insight.agencyMedianValue != null &&
    (insight.agencySampleCount ?? 0) >= 2 &&
    !insight.usesBenchmark
  ) {
    recs.push({
      key: "brainRecAgencyMedianTarget",
      params: {
        median: Number(insight.agencyMedianValue.toFixed(2)),
        count: insight.agencySampleCount ?? 0
      }
    });
  }

  if (insight.insightVariant === "agency_reference" && (insight.agencySampleCount ?? 0) >= 1) {
    recs.push({
      key: "brainRecAgencyPlacementOptimize",
      params: { count: insight.agencySampleCount ?? 0 }
    });
  }

  return recs;
}

function nodeRecommendations(activeNode: CreatorNode | undefined): CreatorBrainRecommendation[] {
  switch (activeNode) {
    case "adset":
      return [{ key: "brainRecDefineAudience" }];
    case "ad":
      return [{ key: "brainRecAddCreative" }];
    case "review":
      return [{ key: "brainRecReviewBudgetAudience" }];
    default:
      return [];
  }
}

export function buildCreatorBrainRecommendations(input: {
  objective: CampaignObjectiveKey;
  insight: CreatorBrainInsightPayload;
  draftContext?: CreatorBrainDraftContext;
  maxItems?: number;
}): CreatorBrainRecommendation[] {
  const maxItems = input.maxItems ?? 6;
  const result: CreatorBrainRecommendation[] = [];
  const seen = new Set<string>();
  const anchor =
    input.insight.marketMedianValue ??
    input.insight.agencyMedianValue ??
    input.insight.clientMedianValue ??
    null;

  const dataQuality = dataQualityRecommendations(input.insight, input.draftContext);
  const budget =
    input.draftContext?.dailyBudgetBRL && anchor != null && anchor > 0
      ? budgetRecommendations({
          metric: input.insight.metric,
          dailyBudgetBRL: input.draftContext.dailyBudgetBRL,
          anchorValue: anchor
        })
      : [];
  const performance = performanceRecommendations(input.insight);
  const objective = objectiveRecommendations(input.objective);
  const node = nodeRecommendations(input.draftContext?.activeNode);

  for (const rec of dataQuality.slice(0, 2)) pushUnique(result, seen, rec);
  for (const rec of budget.slice(0, 1)) pushUnique(result, seen, rec);
  for (const rec of objective.slice(0, 2)) pushUnique(result, seen, rec);
  for (const rec of performance.slice(0, 2)) pushUnique(result, seen, rec);
  for (const rec of dataQuality.slice(2)) pushUnique(result, seen, rec);
  for (const rec of node.slice(0, 1)) pushUnique(result, seen, rec);

  return result.slice(0, maxItems);
}

export function attachRecommendationsToInsight(
  insight: CreatorBrainInsightPayload,
  objective: CampaignObjectiveKey,
  draftContext?: CreatorBrainDraftContext
): CreatorBrainInsightPayload {
  return {
    ...insight,
    recommendations: buildCreatorBrainRecommendations({
      objective,
      insight,
      draftContext
    })
  };
}
