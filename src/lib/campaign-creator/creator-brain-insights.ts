import "server-only";

import { getDataSource } from "@/db/data-source";
import { repositories } from "@/db/repositories";
import { getClientCampaignMetrics } from "@/lib/agency-brain/metrics-input";
import {
  parseClientCompetitors
} from "@/lib/agency-brain/market-memory-service";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";
import { getCampaignPresetsMap } from "@/lib/campaign-preset-store";
import type { CampaignObjectiveKey, CreatorNode } from "@/lib/campaign-draft";
import { mapLimit } from "@/lib/concurrency";
import { fetchCampaigns } from "@/lib/meta-graph";
import {
  fetchMetaAdLibrary,
  isMetaAdLibraryConfigured,
  resolveMetaAdLibraryProvider,
  resolveObjectiveSearchTerms,
  resolveSearchTerms
} from "@/lib/meta-ad-library";
import { attachRecommendationsToInsight } from "@/lib/campaign-creator/creator-brain-recommendations";
import { rollingDaysEndingYesterday } from "@/lib/report-period";

export type CreatorBrainMetric = "cpa" | "cpc" | "ctr";

export type CreatorBrainDataSource =
  | "client_agency"
  | "agency_only"
  | "client_only"
  | "benchmark";

export type CreatorBrainInsightVariant =
  | "client_beats_agency"
  | "client_history"
  | "agency_reference"
  | "benchmark_reference";

export type CreatorBrainResearchStepStatus = "done" | "skipped" | "fallback";

export type CreatorBrainResearchStep = {
  step:
    | "client_campaigns"
    | "agency_search"
    | "agency_matched"
    | "meta_competitor_search"
    | "metrics_computed"
    | "benchmark";
  status: CreatorBrainResearchStepStatus;
  detail?: string;
  count?: number;
};

export type CreatorBrainAnalyzedCampaign = {
  name: string;
  source: "client" | "agency";
};

export type CreatorBrainInsightPayload = {
  kind: "data" | "guidance";
  dataSource?: CreatorBrainDataSource;
  insightVariant?: CreatorBrainInsightVariant;
  usesBenchmark?: boolean;
  metric: CreatorBrainMetric;
  similarCampaignCount: number;
  /** Client + agency campaign samples used for the insight. */
  totalSampleCount: number;
  agencySampleCount?: number;
  marketCampaignCount?: number;
  /** Ads found in Meta Ad Library for client competitors (informational). */
  metaCompetitorAdCount?: number;
  /** Alias for UI — ads returned from Meta Ad Library API. */
  metaAdsConsultedCount?: number;
  metaCompetitorsScanned?: number;
  /** Whether SearchAPI or Meta Graph Ad Library token is configured. */
  metaAdLibraryConfigured?: boolean;
  /** Synced Meta campaigns in period (client), before objective filter. */
  clientSyncedCampaignCount?: number;
  /** Synced Meta campaigns in period (whole agency), before objective filter. */
  agencySyncedCampaignCount?: number;
  referenceCampaignName?: string;
  clientMedianValue?: number | null;
  agencyMedianValue?: number | null;
  marketMedianValue?: number | null;
  improvementPct?: number | null;
  estimateLow?: number | null;
  estimateHigh?: number | null;
  confidence: number;
  creditCost?: number;
  dataLayers?: {
    client: boolean;
    agency: boolean;
    benchmark: boolean;
  };
  researchLog?: CreatorBrainResearchStep[];
  /** Alias for UI timeline — same entries as researchLog. */
  researchSteps?: CreatorBrainResearchStep[];
  analyzedCampaigns?: CreatorBrainAnalyzedCampaign[];
  analyzedCampaignNames?: string[];
  guidanceKey?: string;
  /** Actionable recommendation keys for i18n (params optional). */
  recommendations?: Array<{ key: string; params?: Record<string, string | number> }>;
  activeNode: CreatorNode;
  windowDays: number;
};

type TenantCampaignRow = CampaignMetricsRow & { clientId: string };

type BenchmarkFallback = {
  market: number;
  low: number;
  high: number;
  confidence: number;
};

const OBJECTIVE_BENCHMARKS: Record<CampaignObjectiveKey, BenchmarkFallback> = {
  awareness: { market: 0.85, low: 0.55, high: 1.15, confidence: 48 },
  traffic: { market: 1.05, low: 0.7, high: 1.45, confidence: 48 },
  engagement: { market: 0.95, low: 0.65, high: 1.3, confidence: 48 },
  leads: { market: 24.5, low: 19, high: 27, confidence: 50 },
  app: { market: 18, low: 12, high: 24, confidence: 48 },
  sales: { market: 42, low: 30, high: 55, confidence: 50 }
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function matchesMetaObjective(metaObjective: string, draftObjective: CampaignObjectiveKey): boolean {
  const o = metaObjective.toUpperCase();
  switch (draftObjective) {
    case "awareness":
      return o.includes("AWARENESS") || o.includes("REACH") || o.includes("BRAND");
    case "traffic":
      return o.includes("TRAFFIC") || o.includes("LINK_CLICK");
    case "engagement":
      return o.includes("ENGAGEMENT") || o.includes("POST_ENGAGEMENT");
    case "leads":
      return o.includes("LEAD") || o.includes("OUTCOME_LEADS");
    case "app":
      return o.includes("APP") || o.includes("INSTALL");
    case "sales":
      return o.includes("SALES") || o.includes("CONVERSION") || o.includes("PURCHASE");
    default:
      return false;
  }
}

function inferObjectiveFromName(name: string | null | undefined): CampaignObjectiveKey | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (/lead|formul|captura|whatsapp/.test(n)) return "leads";
  if (/vend|sale|compra|convers|purchase|loja/.test(n)) return "sales";
  if (/engaj|engagement|intera|curtida|coment/.test(n)) return "engagement";
  if (/traf|traffic|clique|click|visita/.test(n)) return "traffic";
  if (/app|install|instala/.test(n)) return "app";
  if (/reconhec|awareness|alcance|reach|brand|impress/.test(n)) return "awareness";
  return null;
}

function presetMatchesObjective(preset: string, draftObjective: CampaignObjectiveKey): boolean {
  const p = preset.toLowerCase();
  switch (draftObjective) {
    case "leads":
      return p === "lead_whatsapp" || p === "lead_site" || p.startsWith("custom:lead") || p.includes("lead");
    case "sales":
      return p === "sales" || p.includes("sale") || p.includes("venda");
    case "awareness":
      return p === "reach" || p.includes("awareness") || p.includes("brand") || p.includes("alcance");
    case "traffic":
      return p.includes("traffic") || p.includes("traf") || p === "default" || p.includes("clique");
    case "engagement":
      return p.includes("engagement") || p.includes("engaj");
    case "app":
      return p.includes("app") || p.includes("install");
    default:
      return false;
  }
}

function primaryMetricForObjective(objective: CampaignObjectiveKey): CreatorBrainMetric {
  if (objective === "leads" || objective === "sales" || objective === "app") return "cpa";
  if (objective === "awareness" || objective === "traffic" || objective === "engagement") return "cpc";
  return "cpa";
}

function metricValue(row: CampaignMetricsRow, metric: CreatorBrainMetric): number | null {
  if (metric === "cpa") {
    return row.cpa != null && row.cpa > 0 ? row.cpa : null;
  }
  if (metric === "cpc") {
    return row.clicks > 0 ? row.spend / row.clicks : null;
  }
  return row.ctr > 0 ? row.ctr : null;
}

function isMeaningfulRow(row: CampaignMetricsRow, metric: CreatorBrainMetric): boolean {
  if (row.spend < 25) return false;
  if (metric === "cpa") return row.conversions >= 1;
  if (metric === "cpc") return row.clicks >= 10;
  return row.impressions >= 200;
}

function lowerIsBetter(metric: CreatorBrainMetric): boolean {
  return metric === "cpa" || metric === "cpc";
}

function confidenceFromLayers(input: {
  clientCount: number;
  agencyCount: number;
  usesBenchmark: boolean;
  hasClientVsAgencyComparison: boolean;
}): number {
  if (input.usesBenchmark && input.clientCount === 0 && input.agencyCount === 0) {
    return 48;
  }

  let score = 38;
  if (input.agencyCount >= 1) score += 14;
  if (input.agencyCount >= 3) score += 14;
  if (input.agencyCount >= 8) score += 8;
  if (input.clientCount === 0 && input.agencyCount >= 3) score += 8;
  if (input.clientCount >= 1) score += 16;
  if (input.clientCount >= 2) score += 8;
  if (input.clientCount >= 4) score += 6;
  if (input.hasClientVsAgencyComparison) score += 8;
  if (input.usesBenchmark) score -= 12;

  return Math.min(94, Math.max(45, score));
}

function rowMatchesObjectiveForClient(
  row: CampaignMetricsRow,
  objective: CampaignObjectiveKey,
  objectiveByCampaignId: Map<string, string>,
  presetByCampaignId: Record<string, string>
): boolean {
  const metaObj = objectiveByCampaignId.get(row.metaCampaignId);
  if (metaObj && matchesMetaObjective(metaObj, objective)) return true;

  const preset = presetByCampaignId[row.metaCampaignId];
  if (preset && presetMatchesObjective(preset, objective)) return true;

  return inferObjectiveFromName(row.campaignName) === objective;
}

function rowMatchesObjectiveForAgency(
  row: CampaignMetricsRow,
  objective: CampaignObjectiveKey,
  objectiveByCampaignId: Map<string, string>,
  presetByCampaignId: Record<string, string>
): boolean {
  const metaObj = objectiveByCampaignId.get(row.metaCampaignId);
  if (metaObj && matchesMetaObjective(metaObj, objective)) return true;

  const preset = presetByCampaignId[row.metaCampaignId];
  if (preset && presetMatchesObjective(preset, objective)) return true;

  return inferObjectiveFromName(row.campaignName) === objective;
}

async function loadTenantObjectiveMap(input: {
  tenantId: string;
  accessToken: string | null;
}): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!input.accessToken) return map;

  const ds = await getDataSource();
  const accounts = await ds.query<Array<{ metaAdAccountId: string }>>(
    `
    SELECT a."metaAdAccountId" AS "metaAdAccountId"
    FROM ad_accounts a
    INNER JOIN clients c ON c.id = a."clientId"
    WHERE c."tenantId" = $1
    `,
    [input.tenantId]
  );
  if (!accounts.length) return map;

  await mapLimit(accounts, 2, async (acc) => {
    try {
      const camps = await fetchCampaigns(input.accessToken!, acc.metaAdAccountId);
      for (const c of camps) {
        if (c.id && c.objective) map.set(c.id, c.objective);
      }
    } catch {
      /* ignore meta errors */
    }
  });

  return map;
}

async function loadTenantCampaignMetrics(
  tenantId: string,
  windowDays: number
): Promise<TenantCampaignRow[]> {
  const ds = await getDataSource();
  const { since, until } = rollingDaysEndingYesterday(windowDays);

  const rows = await ds.query<
    Array<{
      metaCampaignId: string;
      clientId: string;
      campaignName: string | null;
      spend: string;
      conversions: string;
      impressions: string;
      clicks: string;
    }>
  >(
    `
    SELECT
      s."metaCampaignId" AS "metaCampaignId",
      c.id AS "clientId",
      MAX(s."campaignName") AS "campaignName",
      SUM(s.spend::numeric) AS spend,
      SUM(s.conversions::numeric) AS conversions,
      SUM(s.impressions::numeric) AS impressions,
      SUM(s.clicks::numeric) AS clicks
    FROM campaign_metric_snapshots s
    INNER JOIN ad_accounts a ON a.id = s."adAccountId"
    INNER JOIN clients c ON c.id = a."clientId"
    WHERE c."tenantId" = $1
      AND s.day BETWEEN $2 AND $3
    GROUP BY s."metaCampaignId", c.id
    `,
    [tenantId, since, until]
  );

  return rows.map((r) => {
    const spend = Number(r.spend) || 0;
    const conversions = Number(r.conversions) || 0;
    const impressions = Number(r.impressions) || 0;
    const clicks = Number(r.clicks) || 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpa = conversions > 0 ? spend / conversions : null;
    return {
      metaCampaignId: r.metaCampaignId,
      clientId: r.clientId,
      campaignName: r.campaignName ?? r.metaCampaignId,
      spend,
      conversions,
      impressions,
      clicks,
      reach: 0,
      ctr,
      cpa,
      roas: 0,
      frequency: 0
    } satisfies TenantCampaignRow;
  });
}

function buildEstimateRange(
  metric: CreatorBrainMetric,
  anchor: number,
  confidence: number
): { low: number; high: number } {
  const spreadFactor = confidence >= 80 ? 0.1 : confidence >= 65 ? 0.12 : 0.16;
  const spread = Math.max(anchor * spreadFactor, metric === "ctr" ? 0.12 : metric === "cpc" ? 0.15 : 2.5);
  return {
    low: Math.max(0, Number((anchor - spread).toFixed(metric === "ctr" ? 2 : 2))),
    high: Number((anchor + spread).toFixed(metric === "ctr" ? 2 : 2))
  };
}

function improvementPctForMetric(
  metric: CreatorBrainMetric,
  clientValue: number,
  referenceValue: number
): number | null {
  if (referenceValue <= 0) return null;
  if (lowerIsBetter(metric)) {
    return ((referenceValue - clientValue) / referenceValue) * 100;
  }
  return ((clientValue - referenceValue) / referenceValue) * 100;
}

function resolveInsightVariant(input: {
  clientCount: number;
  agencyCount: number;
  usesBenchmark: boolean;
  improvementPct: number | null;
}): CreatorBrainInsightVariant {
  if (input.usesBenchmark && input.agencyCount === 0 && input.clientCount === 0) {
    return "benchmark_reference";
  }
  if (input.improvementPct != null && input.improvementPct >= 8 && input.clientCount > 0) {
    return "client_beats_agency";
  }
  if (input.clientCount > 0) {
    return "client_history";
  }
  return "agency_reference";
}

function resolveDataSource(
  clientCount: number,
  agencyCount: number,
  usesBenchmark: boolean
): CreatorBrainDataSource {
  if (usesBenchmark && agencyCount === 0 && clientCount === 0) return "benchmark";
  if (clientCount > 0 && agencyCount > 0) return "client_agency";
  if (clientCount > 0) return "client_only";
  return "agency_only";
}

function buildAnalyzedCampaigns(
  clientRows: CampaignMetricsRow[],
  agencyRows: CampaignMetricsRow[]
): CreatorBrainAnalyzedCampaign[] {
  const clientLimit = clientRows.length > 0 ? 6 : 0;
  const agencyLimit = clientRows.length > 0 ? 6 : 12;
  const clientEntries = clientRows.slice(0, clientLimit).map((row) => ({
    name: row.campaignName ?? row.metaCampaignId,
    source: "client" as const
  }));
  const agencyEntries = agencyRows.slice(0, agencyLimit).map((row) => ({
    name: row.campaignName ?? row.metaCampaignId,
    source: "agency" as const
  }));
  return [...clientEntries, ...agencyEntries].slice(0, 12);
}

type MetaCompetitorResearchResult = {
  adsCount: number;
  competitorsScanned: number;
  status: CreatorBrainResearchStepStatus;
  detail?: string;
  /** True when Meta Ad Library HTTP API was invoked (not skipped). */
  apiCalled?: boolean;
};

async function resolveMetaCompetitorResearch(input: {
  tenantId: string;
  clientId?: string | null;
  objective: CampaignObjectiveKey;
}): Promise<MetaCompetitorResearchResult> {
  if (!isMetaAdLibraryConfigured()) {
    console.warn(
      "[creator-brain/meta_competitor_search] skipped — SEARCHAPI_API_KEY or META_AD_LIBRARY_ACCESS_TOKEN not configured"
    );
    return { adsCount: 0, competitorsScanned: 0, status: "skipped", detail: "api_not_configured" };
  }

  if (!input.clientId) {
    const searchTerms = resolveObjectiveSearchTerms(input.objective);
    const fetchResult = await fetchMetaAdLibrary({
      competitors: [],
      searchTerms,
      marketCountry: "BR",
      maxAdsPerQuery: 15
    });

    if (!fetchResult.apiConfigured) {
      return { adsCount: 0, competitorsScanned: 0, status: "skipped", detail: "api_not_configured" };
    }

    const adsCount = fetchResult.ads.length;
    const provider = resolveMetaAdLibraryProvider();
    if (fetchResult.apiError) {
      console.warn(
        "[creator-brain/meta_competitor_search]",
        "agency_objective_search",
        fetchResult.apiError,
        { provider, adsCount, objective: input.objective, searchTerms: searchTerms.slice(0, 3) }
      );
    } else {
      console.info(
        "[creator-brain/meta_competitor_search]",
        "agency_objective_search",
        { provider, adsCount, objective: input.objective, searchTerms: searchTerms.slice(0, 3) }
      );
    }

    return {
      adsCount,
      competitorsScanned: 0,
      status: adsCount > 0 ? "done" : "fallback",
      detail: fetchResult.apiError && adsCount === 0 ? "api_error" : "objective_keywords_only",
      apiCalled: true
    };
  }

  const { client: clientRepo } = await repositories();
  const client = await clientRepo.findOne({ where: { id: input.clientId, tenantId: input.tenantId } });
  if (!client) {
    return { adsCount: 0, competitorsScanned: 0, status: "skipped", detail: "no_client_selected" };
  }

  const competitors = parseClientCompetitors(client.competitors);
  const nicheOnly = competitors.length === 0;
  const searchTerms = resolveSearchTerms(client.niche);

  const fetchResult = await fetchMetaAdLibrary({
    competitors: competitors.map((c) => ({ name: c.name, pageId: c.pageId })),
    searchTerms,
    marketCountry: client.marketCountry,
    maxAdsPerQuery: 15
  });

  if (!fetchResult.apiConfigured) {
    return { adsCount: 0, competitorsScanned: 0, status: "skipped", detail: "api_not_configured" };
  }

  const competitorsScanned = nicheOnly
    ? 0
    : competitors.filter((c) => c.pageId).length || competitors.length;
  const adsCount = fetchResult.ads.length;

  const provider = resolveMetaAdLibraryProvider();
  if (fetchResult.apiError) {
    console.warn(
      "[creator-brain/meta_competitor_search]",
      input.clientId,
      fetchResult.apiError,
      { provider, adsCount, nicheOnly, competitors: competitors.length }
    );
  } else {
    console.info(
      "[creator-brain/meta_competitor_search]",
      input.clientId,
      { provider, adsCount, nicheOnly, competitors: competitors.length, searchTerms: searchTerms.slice(0, 3) }
    );
  }

  let detail: string | undefined;
  if (fetchResult.apiError && adsCount === 0) {
    detail = "api_error";
  } else if (nicheOnly) {
    detail = "niche_keywords_only";
  }

  return {
    adsCount,
    competitorsScanned,
    status: adsCount > 0 ? "done" : "fallback",
    detail,
    apiCalled: true
  };
}

function buildResearchLog(input: {
  clientId?: string | null;
  /** Synced Meta campaigns for the client (before objective filter). */
  clientSyncedCount: number;
  /** Client campaigns matching objective + meaningful metrics. */
  clientMatchedCount: number;
  agencyTotalScanned: number;
  agencyCount: number;
  metaCompetitor: MetaCompetitorResearchResult;
  usesBenchmark: boolean;
  benchmarkOnly: boolean;
  metricsComputed: boolean;
}): CreatorBrainResearchStep[] {
  let clientDetail: string | undefined;
  if (!input.clientId) {
    clientDetail = "no_client_selected";
  } else if (input.clientSyncedCount === 0) {
    clientDetail = "no_synced_campaigns";
  } else if (input.clientMatchedCount === 0) {
    clientDetail = "no_objective_match";
  }

  const steps: CreatorBrainResearchStep[] = [
    {
      step: "client_campaigns",
      status: input.clientSyncedCount > 0 ? "done" : "skipped",
      count: input.clientSyncedCount,
      detail: clientDetail
    },
    {
      step: "agency_search",
      status: "done",
      count: input.agencyTotalScanned
    },
    {
      step: "agency_matched",
      status: input.agencyCount > 0 ? "done" : "skipped",
      count: input.agencyCount
    },
    {
      step: "meta_competitor_search",
      status: input.metaCompetitor.status,
      count: input.metaCompetitor.adsCount,
      detail:
        input.metaCompetitor.status === "skipped"
          ? input.metaCompetitor.detail
          : input.metaCompetitor.detail
    }
  ];

  if (input.metricsComputed) {
    steps.push({
      step: "metrics_computed",
      status: "done",
      count: input.clientMatchedCount + input.agencyCount
    });
  }

  if (input.benchmarkOnly || input.usesBenchmark) {
    steps.push({
      step: "benchmark",
      status: input.benchmarkOnly ? "fallback" : "done",
      count: input.benchmarkOnly ? 0 : undefined
    });
  }

  return steps;
}

function attachResearchMetadata(
  payload: CreatorBrainInsightPayload,
  clientRows: CampaignMetricsRow[],
  agencyRows: CampaignMetricsRow[],
  input: {
    clientId?: string | null;
    clientSyncedCount: number;
    agencyTotalScanned: number;
    metaCompetitor: MetaCompetitorResearchResult;
    usesBenchmark: boolean;
    benchmarkOnly: boolean;
    metricsComputed: boolean;
  }
): CreatorBrainInsightPayload {
  const researchLog = buildResearchLog({
    clientId: input.clientId,
    clientSyncedCount: input.clientSyncedCount,
    clientMatchedCount: clientRows.length,
    agencyTotalScanned: input.agencyTotalScanned,
    agencyCount: agencyRows.length,
    metaCompetitor: input.metaCompetitor,
    usesBenchmark: input.usesBenchmark,
    benchmarkOnly: input.benchmarkOnly,
    metricsComputed: input.metricsComputed
  });
  const analyzedCampaigns = buildAnalyzedCampaigns(clientRows, agencyRows);

  return {
    ...payload,
    metaCompetitorAdCount: input.metaCompetitor.adsCount,
    metaAdsConsultedCount: input.metaCompetitor.adsCount,
    metaCompetitorsScanned: input.metaCompetitor.competitorsScanned,
    metaAdLibraryConfigured: isMetaAdLibraryConfigured(),
    clientSyncedCampaignCount: input.clientSyncedCount,
    agencySyncedCampaignCount: input.agencyTotalScanned,
    researchLog,
    researchSteps: researchLog,
    analyzedCampaigns,
    analyzedCampaignNames: analyzedCampaigns.map((c) => c.name)
  };
}

export async function buildCreatorBrainInsight(input: {
  tenantId: string;
  clientId?: string | null;
  objective: CampaignObjectiveKey;
  activeNode: CreatorNode;
  metaAccessToken?: string | null;
  windowDays?: number;
  creditCost?: number;
}): Promise<CreatorBrainInsightPayload> {
  const windowDays = input.windowDays ?? 30;
  const metric = primaryMetricForObjective(input.objective);
  const benchmark = OBJECTIVE_BENCHMARKS[input.objective];

  const [clientRows, tenantRows, tenantObjectiveMap, presetMap, metaCompetitor] = await Promise.all([
    input.clientId
      ? getClientCampaignMetrics(input.tenantId, input.clientId, windowDays)
      : Promise.resolve([] as CampaignMetricsRow[]),
    loadTenantCampaignMetrics(input.tenantId, windowDays),
    loadTenantObjectiveMap({
      tenantId: input.tenantId,
      accessToken: input.metaAccessToken ?? null
    }),
    getCampaignPresetsMap(input.tenantId),
    resolveMetaCompetitorResearch({
      tenantId: input.tenantId,
      clientId: input.clientId,
      objective: input.objective
    })
  ]);

  const similarClientRows = clientRows
    .filter((row) => rowMatchesObjectiveForClient(row, input.objective, tenantObjectiveMap, presetMap))
    .filter((row) => isMeaningfulRow(row, metric));

  const agencyPoolRows = tenantRows.filter((row) => {
    if (input.clientId && row.clientId === input.clientId) return false;
    return rowMatchesObjectiveForAgency(row, input.objective, tenantObjectiveMap, presetMap);
  });

  const similarAgencyRows = agencyPoolRows.filter((row) => isMeaningfulRow(row, metric));

  const clientValues = similarClientRows
    .map((row) => metricValue(row, metric))
    .filter((v): v is number => v != null && v > 0);

  const agencyValues = similarAgencyRows
    .map((row) => metricValue(row, metric))
    .filter((v): v is number => v != null && v > 0);

  const clientMedian = median(clientValues);
  const agencyMedian = median(agencyValues);
  const noRealData = agencyMedian == null && clientMedian == null;

  if (noRealData) {
    const payload = attachResearchMetadata(
      {
        kind: "data",
        dataSource: "benchmark",
        insightVariant: "benchmark_reference",
        usesBenchmark: true,
        metric,
        similarCampaignCount: 0,
        totalSampleCount: 0,
        agencySampleCount: 0,
        marketCampaignCount: 0,
        clientMedianValue: null,
        agencyMedianValue: null,
        marketMedianValue: benchmark.market,
        improvementPct: null,
        estimateLow: benchmark.low,
        estimateHigh: benchmark.high,
        confidence: benchmark.confidence,
        creditCost: input.creditCost,
        dataLayers: {
          client: similarClientRows.length > 0 || clientRows.length > 0,
          agency: similarAgencyRows.length > 0,
          benchmark: true
        },
        activeNode: input.activeNode,
        windowDays
      },
      similarClientRows,
      similarAgencyRows,
      {
        clientId: input.clientId,
        clientSyncedCount: clientRows.length,
        agencyTotalScanned: tenantRows.length,
        metaCompetitor,
        usesBenchmark: true,
        benchmarkOnly: true,
        metricsComputed: false
      }
    );
    return attachRecommendationsToInsight(payload, input.objective, {
      hasClient: Boolean(input.clientId)
    });
  }

  const displayMedian = agencyMedian ?? clientMedian ?? benchmark.market;
  const usesBenchmarkForDisplay = agencyMedian == null && clientMedian == null;
  const dataSource = resolveDataSource(
    similarClientRows.length,
    similarAgencyRows.length,
    usesBenchmarkForDisplay && similarClientRows.length === 0
  );

  const bestClientRow = similarClientRows
    .map((row) => ({ row, value: metricValue(row, metric) }))
    .filter((x): x is { row: CampaignMetricsRow; value: number } => x.value != null && x.value > 0)
    .sort((a, b) => (lowerIsBetter(metric) ? a.value - b.value : b.value - a.value))[0];

  let improvementPct: number | null = null;
  if (clientMedian != null && agencyMedian != null) {
    improvementPct = improvementPctForMetric(metric, clientMedian, agencyMedian);
  }

  const insightVariant = resolveInsightVariant({
    clientCount: similarClientRows.length,
    agencyCount: similarAgencyRows.length,
    usesBenchmark: usesBenchmarkForDisplay && similarClientRows.length === 0,
    improvementPct
  });

  const confidence = confidenceFromLayers({
    clientCount: similarClientRows.length,
    agencyCount: similarAgencyRows.length,
    usesBenchmark: usesBenchmarkForDisplay && similarClientRows.length === 0,
    hasClientVsAgencyComparison: clientMedian != null && agencyMedian != null
  });

  const estimateAnchor = clientMedian ?? agencyMedian ?? benchmark.market;
  const { low: estimateLow, high: estimateHigh } = buildEstimateRange(metric, estimateAnchor, confidence);

  const payload = attachResearchMetadata(
    {
      kind: "data",
      dataSource,
      insightVariant,
      usesBenchmark: usesBenchmarkForDisplay,
      metric,
      similarCampaignCount: similarClientRows.length,
      totalSampleCount: similarClientRows.length + similarAgencyRows.length,
      agencySampleCount: similarAgencyRows.length,
      marketCampaignCount: similarAgencyRows.length,
      referenceCampaignName: bestClientRow?.row.campaignName,
      clientMedianValue: clientMedian,
      agencyMedianValue: agencyMedian,
      marketMedianValue: displayMedian,
      improvementPct,
      estimateLow,
      estimateHigh,
      confidence,
      creditCost: input.creditCost,
      dataLayers: {
        client: similarClientRows.length > 0 || clientRows.length > 0,
        agency: similarAgencyRows.length > 0,
        benchmark: usesBenchmarkForDisplay
      },
      activeNode: input.activeNode,
      windowDays
    },
    similarClientRows,
    similarAgencyRows,
    {
      clientId: input.clientId,
      clientSyncedCount: clientRows.length,
      agencyTotalScanned: tenantRows.length,
      metaCompetitor,
      usesBenchmark: usesBenchmarkForDisplay,
      benchmarkOnly: false,
      metricsComputed: true
    }
  );
  return attachRecommendationsToInsight(payload, input.objective, {
    hasClient: Boolean(input.clientId)
  });
}
