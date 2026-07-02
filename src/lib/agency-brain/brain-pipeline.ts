import "server-only";

import { repositories } from "@/db/repositories";
import { slugify } from "@/lib/app-context";
import { loadClientSignals, type ClientSignalsContext } from "@/lib/agency-brain/client-signals";
import { runLearningSuggestionsForClient } from "@/lib/agency-brain/learning-suggestion-service";
import { runHypothesisSuggestionsForClient } from "@/lib/agency-brain/hypothesis-service";
import { runActionSuggestionsForClient } from "@/lib/action-suggestions/action-suggestion-generator";
import { automationExecutionsToLearningDrafts } from "@/lib/agency-brain/automation-learnings-service";
import {
  adsetComparisonsToSignals,
  detectAdsetAudienceChanges
} from "@/lib/agency-brain/adset-audience-analyzer";
import { getAdsetMetricsRowsByCampaign } from "@/lib/agency-brain/metrics-input";
import {
  aggregateCreativesFromAccountData,
  creativesToSignals,
  getTopCreativesByPreset,
  mapAggregatesToCreatives,
  rankedCreativesFromGroups,
  type CreativeAgg
} from "@/lib/agency-brain/creative-intelligence";
import { fatiguedCreativesToLearningDrafts } from "@/lib/agency-brain/creative-patterns-service";
import { createSuggestedLearning } from "@/lib/agency-brain/client-learning-service";
import { hasActiveSignalDedupe } from "@/lib/agency-brain/signal-dedupe";
import { fetchAllAccountCreatives } from "@/lib/creatives-access";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { loadRankConfig } from "@/lib/ranking-config";
import { rollingDaysEndingYesterday } from "@/lib/report-period";
import type { CampaignPresetKey } from "@/lib/campaign-presets";

async function enrichClientSignals(
  tenantId: string,
  clientId: string,
  ctx: ClientSignalsContext
): Promise<ClientSignalsContext> {
  const extraSignals = [...ctx.signals];

  const adsetByCampaign = await getAdsetMetricsRowsByCampaign(clientId);
  const { campaignPreset: presetRepo } = await repositories();
  const presetRows = await presetRepo.find({ where: { tenantId } });
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));

  for (const [metaCampaignId, rows] of adsetByCampaign) {
    const preset = (presetByCampaign.get(metaCampaignId) ?? "default") as CampaignPresetKey;
    const comparisons = detectAdsetAudienceChanges(metaCampaignId, rows, preset);
    extraSignals.push(...adsetComparisonsToSignals(comparisons, ctx.current, ctx.windowDays));
  }

  try {
    const tokens = await getAllTenantMetaTokens(tenantId);
    if (tokens.length) {
      const { adAccount: adAccountRepo } = await repositories();
      const accounts = await adAccountRepo.find({ where: { clientId } });
      const period = rollingDaysEndingYesterday(ctx.windowDays);
      const { results } = await fetchAllAccountCreatives(accounts, {
        tokens,
        since: period.since,
        until: period.until,
        tenantId,
        clientId,
        skipCache: true
      });
      const byCreative = new Map<string, CreativeAgg>();
      for (const { ads, insights } of results) {
        aggregateCreativesFromAccountData({
          ads,
          insights,
          clientSlug: "",
          presetByCampaign,
          into: byCreative
        });
      }
      const creatives = mapAggregatesToCreatives(byCreative, "", presetByCampaign);
      const rankConfig = await loadRankConfig(tenantId);
      const groups = getTopCreativesByPreset(creatives, rankConfig, {
        periodDays: ctx.windowDays
      });
      const ranked = rankedCreativesFromGroups(groups);
      extraSignals.push(...creativesToSignals(ranked, ctx.current, ctx.windowDays));

      const fatigueDrafts = fatiguedCreativesToLearningDrafts(creatives, clientId, ctx.windowDays);
      for (const draft of fatigueDrafts) {
        const blocked = await hasActiveSignalDedupe(tenantId, clientId, draft.dedupeKey);
        if (blocked.hypothesis) continue;
        await createSuggestedLearning(tenantId, clientId, draft);
      }
    }
  } catch {
    // ranking opcional no pipeline
  }

  return { ...ctx, signals: extraSignals };
}

export async function runAgencyBrainPipeline(tenantId: string, clientId?: string) {
  const { client: clientRepo } = await repositories();

  const clients = clientId
    ? await clientRepo.find({ where: { tenantId, id: clientId } })
    : await clientRepo.find({ where: { tenantId } });

  for (const c of clients) {
    const baseCtx = await loadClientSignals(tenantId, c.id);
    if (!baseCtx) continue;

    const ctx = await enrichClientSignals(tenantId, c.id, baseCtx);

    await runHypothesisSuggestionsForClient(tenantId, c.id, ctx);
    await runLearningSuggestionsForClient(tenantId, c.id, ctx);
    await runActionSuggestionsForClient(tenantId, c.id, slugify(c.name), ctx);

    // Aresta Engine→Brain: o log de execução das automações vira aprendizado sugerido
    // (dedupe pelo próprio createSuggestedLearning; best-effort como o resto do pipeline).
    try {
      const automationDrafts = await automationExecutionsToLearningDrafts(
        tenantId,
        c.id,
        ctx.windowDays
      );
      for (const draft of automationDrafts) {
        await createSuggestedLearning(tenantId, c.id, draft);
      }
    } catch {
      // aprendizados de automação são opcionais no pipeline
    }
  }
}
