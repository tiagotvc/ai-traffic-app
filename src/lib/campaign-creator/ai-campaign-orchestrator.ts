import "server-only";

import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { loadClientSignals } from "@/lib/agency-brain/client-signals";
import type { CampaignSignal } from "@/lib/agency-brain/campaign-signal-analyzer";
import {
  applySuggestionToDraftTargeting,
  generateAudiencePersonaPreview,
  generateAudienceTargetingSuggestion
} from "@/lib/audience-targeting-ai";
import {
  getAudienceBreakdownContext,
  syncAudienceInsightBreakdowns
} from "@/lib/audience-insight-breakdowns";
import { generateAdCopy } from "@/lib/campaign-creator-ai";
import { buildDraftPatchFromMetaCampaign } from "@/lib/campaign-creator/import-campaign-snapshot";
import {
  CAMPAIGN_OBJECTIVES,
  type CampaignDraftPayload,
  defaultAdItem,
  defaultAdSetItem,
  defaultCampaignDraft,
  newDraftId,
  parseCampaignDraftPayload,
  validatePublishDraft,
  type CampaignObjectiveKey
} from "@/lib/campaign-draft";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";
import { getResolvedClientMeta } from "@/lib/client-meta-settings";
import { llmGenerateJson } from "@/lib/llm/generate-json";
import type { LlmProviderId } from "@/lib/llm/types";
import { fetchCustomAudiences } from "@/lib/meta-graph";
import { rollingDaysEndingYesterday } from "@/lib/report-period";
import { loadClientCreativesPerformance } from "@/lib/report-creatives-performance";

export type AiCampaignStrategy = "scale_winner" | "new_audience_test" | "creative_refresh";

export type AiCampaignRationale = {
  summary: string;
  signals: string[];
  audienceReason: string;
  copyReason: string;
};

export type AiSuggestedAudience = {
  type: string;
  name: string;
  reason: string;
};

export type AiCampaignGenerateResult = {
  draft: CampaignDraftPayload;
  draftName: string;
  strategy: AiCampaignStrategy;
  rationale: AiCampaignRationale;
  referenceCampaignId?: string;
  suggestedAudiences: AiSuggestedAudience[];
  validationWarning: string | null;
  modelMeta: { modelUsed: string; provider: LlmProviderId };
};

const StrategySchema = z.object({
  strategy: z.enum(["scale_winner", "new_audience_test", "creative_refresh"]),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  referenceCampaignId: z.string().nullable(),
  campaignName: z.string().min(1),
  adsetName: z.string().min(1),
  adName: z.string().min(1),
  rationale: z.string(),
  audienceReason: z.string(),
  copyReason: z.string(),
  dailyBudgetBRL: z.number().positive().optional()
});

const AudienceSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(["website", "engagement", "lookalike", "combined", "saved_targeting"]),
      name: z.string(),
      payload: z.record(z.string(), z.unknown()),
      reason: z.string().optional()
    })
  )
});

function signalLabel(s: CampaignSignal): string {
  const name = s.campaign.campaignName ?? s.campaign.metaCampaignId;
  return `${s.type} (${s.tier}): ${name}`;
}

function pickReferenceCampaignId(
  signals: CampaignSignal[],
  campaigns: Awaited<ReturnType<typeof queryCommandCenterCampaigns>>["rows"]
): string | null {
  const positive = signals
    .filter(
      (s) =>
        ["roas_lift", "cpa_efficient", "ctr_strong"].includes(s.type) &&
        (s.tier === "strong" || s.tier === "medium")
    )
    .sort((a, b) => b.priorityScore - a.priorityScore);

  if (positive[0]?.campaign.metaCampaignId) {
    return positive[0].campaign.metaCampaignId;
  }

  const sorted = [...campaigns]
    .filter((r) => r.spend > 50 && (r.conversions > 0 || r.messages > 0))
    .sort((a, b) => b.roas - a.roas || b.conversions - a.conversions);

  return sorted[0]?.metaCampaignId ?? campaigns[0]?.metaCampaignId ?? null;
}

async function runInternalAudienceSuggestions(args: {
  provider: LlmProviderId;
  prompt: string;
  count: number;
  breakdowns: unknown;
  topCampaigns: unknown[];
  audiences: Array<{ id: string; name?: string; subtype?: string }>;
  brainContext?: {
    audienceLearnings: string[];
    dnaAudiences: string[];
    audienceShiftSignals: string[];
  };
}): Promise<z.infer<typeof AudienceSuggestionSchema>["suggestions"]> {
  const systemPrompt = `Você é um especialista em públicos Meta Ads. Gere exatamente ${args.count} sugestões de novos públicos.
Tipos permitidos: website, engagement, lookalike, combined, saved_targeting.
Priorize sugestões "combined" (cruzar 2+ públicos com melhor desempenho) e "lookalike" de origens fortes.
Para combined: { includeAudienceIds: string[], excludeAudienceIds?: string[] }.
Para saved_targeting: { targeting: { age_min?, age_max?, genders?, geo_locations?, flexible_spec? } }.
Responda JSON: { "suggestions": [...] }`;

  const userPrompt = JSON.stringify({
    userPrompt: args.prompt,
    demographicBreakdowns: args.breakdowns,
    topCampaigns: args.topCampaigns,
    allAudienceIds: args.audiences.slice(0, 30),
    brainAudienceLearnings: args.brainContext?.audienceLearnings ?? [],
    brainDnaAudiences: args.brainContext?.dnaAudiences ?? [],
    audienceShiftSignals: args.brainContext?.audienceShiftSignals ?? []
  });

  const result = await llmGenerateJson({
    provider: args.provider,
    prompt: [systemPrompt, "", "Dados:", userPrompt].join("\n"),
    schema: AudienceSuggestionSchema,
    temperature: 0.35
  });

  return result.data.suggestions.slice(0, args.count);
}

function applySavedTargetingSuggestion(
  draft: CampaignDraftPayload,
  payload: Record<string, unknown>
): CampaignDraftPayload {
  const targeting = payload.targeting as Record<string, unknown> | undefined;
  if (!targeting) return draft;

  const adset = draft.adsets[0];
  if (!adset) return draft;

  const fakeSuggestion = {
    title: "",
    summary: "",
    name: "",
    targeting,
    items: [],
    includeCustomAudienceIds: (
      (targeting.custom_audiences as Array<{ id: string }> | undefined) ?? []
    ).map((a) => a.id),
    excludeCustomAudienceIds: (
      (targeting.excluded_custom_audiences as Array<{ id: string }> | undefined) ?? []
    ).map((a) => a.id),
    provider: "gemini" as const,
    modelUsed: ""
  };

  return {
    ...draft,
    adsets: draft.adsets.map((a, i) =>
      i === 0
        ? {
            ...a,
            targeting: applySuggestionToDraftTargeting(a.targeting, fakeSuggestion)
          }
        : a
    )
  };
}

export async function generateAiCampaignDraft(args: {
  tenantId: string;
  clientId: string;
  clientSlug: string;
  clientName: string;
  adAccountId: string;
  accessToken: string;
  locale: string;
  provider?: LlmProviderId;
  userPrompt?: string;
  geminiApiKey: string;
}): Promise<AiCampaignGenerateResult> {
  const provider: LlmProviderId = args.provider ?? "gemini";
  const locale = args.locale;
  const isEn = locale.startsWith("en");

  const period = rollingDaysEndingYesterday(7);

  const [signalsCtx, brain, campaigns, resolvedMeta] = await Promise.all([
    loadClientSignals(args.tenantId, args.clientId, 7),
    getClientBrainContext(args.tenantId, args.clientId),
    queryCommandCenterCampaigns({
      tenantId: args.tenantId,
      clientIds: [args.clientId],
      limit: 15
    }),
    getResolvedClientMeta(args.tenantId, args.clientId)
  ]);

  try {
    await syncAudienceInsightBreakdowns({
      clientId: args.clientId,
      metaAdAccountId: args.adAccountId,
      accessToken: args.accessToken
    });
  } catch {
    /* cached */
  }

  const [breakdowns, customAudiences, creativesPerf] = await Promise.all([
    getAudienceBreakdownContext(args.clientId, args.adAccountId),
    fetchCustomAudiences(args.accessToken, args.adAccountId),
    loadClientCreativesPerformance({
      tenantId: args.tenantId,
      clientParam: args.clientId,
      adAccountId: args.adAccountId,
      since: period.since,
      until: period.until
    })
  ]);

  const signals = signalsCtx?.signals ?? [];
  const referenceCampaignId = pickReferenceCampaignId(signals, campaigns.rows);

  const topCreatives = creativesPerf.groups
    .flatMap((g) =>
      g.best.slice(0, 2).map((c) => ({
        name: c.name,
        tier: "best" as const,
        preset: c.dominantPreset,
        primaryMetric: g.primaryMetric
      }))
    )
    .slice(0, 5);
  const topCampaigns = campaigns.rows.slice(0, 8).map((r) => ({
    id: r.metaCampaignId,
    name: r.campaignName,
    spend: r.spend,
    conversions: r.conversions,
    roas: r.roas,
    cpa: r.cpa,
    ctr: r.ctr,
    messages: r.messages
  }));

  const strategyContext = {
    clientName: args.clientName,
    userPrompt: args.userPrompt ?? "",
    brainSummary: brain.summaryText.slice(0, 1500),
    topSignals: signals.slice(0, 12).map(signalLabel),
    topCampaigns,
    topCreatives: topCreatives.map((c) => ({
      name: c.name,
      tier: c.tier,
      preset: c.preset,
      primaryMetric: c.primaryMetric
    })),
    referenceCampaignId,
    audienceLearnings: brain.audienceLearnings.slice(0, 5).map((l) => l.title),
    customAudienceCount: customAudiences.length
  };

  const strategyResult = await llmGenerateJson({
    provider,
    prompt: [
      "Você é estrategista de mídia paga Meta Ads. Com base nos dados, escolha UMA estratégia para uma nova campanha:",
      "- scale_winner: escalar campanha/adset que já performa (clonar estrutura vencedora)",
      "- creative_refresh: manter público vencedor mas testar novos criativos/textos",
      "- new_audience_test: testar novo público (combine, lookalike ou segmentação nova) com criativo inspirado nos melhores",
      "",
      "Defina objective entre: awareness, traffic, engagement, leads, app, sales.",
      "Use referenceCampaignId da campanha referência quando scale_winner ou creative_refresh.",
      "Nomes em " + (isEn ? "inglês" : "português brasileiro") + ".",
      "",
      "Responda APENAS JSON com: strategy, objective, referenceCampaignId, campaignName, adsetName, adName, rationale, audienceReason, copyReason, dailyBudgetBRL?",
      "",
      "Dados:",
      JSON.stringify(strategyContext)
    ].join("\n"),
    schema: StrategySchema,
    temperature: 0.25
  });

  const strategy = strategyResult.data;
  const refId = strategy.referenceCampaignId ?? referenceCampaignId;

  let draft = defaultCampaignDraft(locale);
  draft.clientSlug = args.clientSlug;
  draft.adAccountId = args.adAccountId;
  draft.objective = strategy.objective;
  draft.campaign.name = strategy.campaignName;
  draft.campaign.dailyBudgetBRL = strategy.dailyBudgetBRL ?? draft.campaign.dailyBudgetBRL;

  const adsetId = newDraftId();
  const adId = newDraftId();
  const baseAdset = defaultAdSetItem(locale, strategy.adsetName);
  const baseAd = defaultAdItem(locale, strategy.adName);

  draft.adsets = [{ ...baseAdset, id: adsetId, name: strategy.adsetName }];
  draft.ads = [{ ...baseAd, id: adId, name: strategy.adName }];
  draft.activeAdsetId = adsetId;
  draft.activeAdId = adId;
  draft.visitedNodes = ["campaign", "adset", "ad", "review"];
  draft.objective = strategy.objective as CampaignObjectiveKey;

  const suggestedAudiences: AiSuggestedAudience[] = [];
  let audienceApplied = false;

  if (
    (strategy.strategy === "scale_winner" || strategy.strategy === "creative_refresh") &&
    refId
  ) {
    const patch = await buildDraftPatchFromMetaCampaign(args.accessToken, refId, locale);
    if (patch) {
      draft = parseCampaignDraftPayload({
        ...draft,
        ...patch,
        clientSlug: args.clientSlug,
        adAccountId: args.adAccountId,
        campaign: {
          ...draft.campaign,
          ...patch.campaign,
          name: strategy.campaignName
        },
        adsets: patch.adsets?.map((a, i) =>
          i === 0 ? { ...a, id: adsetId, name: strategy.adsetName } : a
        ) ?? draft.adsets,
        ads: patch.ads?.map((a, i) =>
          i === 0 ? { ...a, id: adId, name: strategy.adName } : a
        ) ?? draft.ads,
        activeAdsetId: adsetId,
        activeAdId: adId,
        copyFromCampaignEnabled: true,
        copyFromCampaignId: refId
      });
      audienceApplied = true;
    }
  }

  if (strategy.strategy === "new_audience_test") {
    const audienceShiftSignals = signals
      .filter((s) => s.type === "audience_shift")
      .map(signalLabel);

    const suggestions = await runInternalAudienceSuggestions({
      provider,
      prompt:
        args.userPrompt ??
        `Sugerir novos públicos para ${args.clientName}. Priorize combine e lookalike cruzando públicos com melhor CPA/ROAS.`,
      count: 3,
      breakdowns,
      topCampaigns,
      audiences: customAudiences,
      brainContext: {
        audienceLearnings: brain.audienceLearnings.map((l) => l.title),
        dnaAudiences: brain.dna?.audiences?.works ?? [],
        audienceShiftSignals
      }
    });

    for (const s of suggestions) {
      suggestedAudiences.push({
        type: s.type,
        name: s.name,
        reason: s.reason ?? s.description
      });
    }

    const savedTargeting = suggestions.find((s) => s.type === "saved_targeting");
    const combined = suggestions.find((s) => s.type === "combined");

    if (savedTargeting) {
      draft = applySavedTargetingSuggestion(draft, savedTargeting.payload);
      audienceApplied = true;
    } else if (combined) {
      const includeIds = (combined.payload.includeAudienceIds as string[] | undefined) ?? [];
      const excludeIds = (combined.payload.excludeAudienceIds as string[] | undefined) ?? [];
      draft = {
        ...draft,
        adsets: draft.adsets.map((a, i) =>
          i === 0
            ? {
                ...a,
                targeting: {
                  ...a.targeting,
                  customAudienceIds: includeIds,
                  excludedAudienceIds: excludeIds
                }
              }
            : a
        )
      };
      audienceApplied = true;
    } else {
      const brief = {
        businessDescription: brain.summaryText.slice(0, 400) || args.clientName,
        targetProfile:
          brain.audienceLearnings[0]?.description?.slice(0, 300) ??
          strategy.audienceReason.slice(0, 300),
        behaviors: strategy.audienceReason,
        countries: resolvedMeta?.settings.targeting?.countries ?? ["BR"],
        ageMin: resolvedMeta?.settings.targeting?.age_min ?? 18,
        ageMax: resolvedMeta?.settings.targeting?.age_max ?? 65,
        gender: "all" as const,
        includeCustomAudienceIds: resolvedMeta?.settings.defaultCustomAudienceIds ?? [],
        excludeCustomAudienceIds: resolvedMeta?.settings.defaultExcludedAudienceIds ?? [],
        rejectedSegmentIds: [],
        rejectedSegments: [],
        avoidSegmentIds: []
      };

      const persona = await generateAudiencePersonaPreview({ provider, brief });
      const targetingSuggestion = await generateAudienceTargetingSuggestion({
        accessToken: args.accessToken,
        adAccountId: args.adAccountId,
        provider,
        brief,
        persona,
        clientName: args.clientName,
        customAudiences
      });

      draft = {
        ...draft,
        adsets: draft.adsets.map((a, i) =>
          i === 0
            ? {
                ...a,
                targeting: applySuggestionToDraftTargeting(a.targeting, targetingSuggestion),
                name: strategy.adsetName
              }
            : a
        )
      };
      audienceApplied = true;
    }
  }

  if (!audienceApplied && resolvedMeta) {
    const t = resolvedMeta.settings.targeting;
    draft = {
      ...draft,
      adsets: draft.adsets.map((a, i) =>
        i === 0
          ? {
              ...a,
              targeting: {
                ...a.targeting,
                locations: (t.countries ?? ["BR"]).map((c) => ({
                  value: c,
                  label: c,
                  meta: { type: "country", countryCode: c }
                })),
                ageMin: t.age_min ?? 18,
                ageMax: t.age_max ?? 65,
                customAudienceIds: resolvedMeta.settings.defaultCustomAudienceIds ?? [],
                excludedAudienceIds: resolvedMeta.settings.defaultExcludedAudienceIds ?? []
              },
              pixelId: resolvedMeta.settings.metaPixelId ?? a.pixelId
            }
          : a
      )
    };
  }

  const copyPrompt =
    args.userPrompt ??
    `${strategy.copyReason}. Objetivo: ${strategy.objective}. Inspire-se nos melhores criativos e aprendizados do cliente.`;

  const copy = await generateAdCopy({
    apiKey: args.geminiApiKey,
    prompt: copyPrompt,
    objective: strategy.objective,
    locale,
    countTitles: 3,
    countBodies: 2,
    clientContext: brain.summaryText
  });

  draft = {
    ...draft,
    ads: draft.ads.map((a, i) =>
      i === 0
        ? {
            ...a,
            titles: copy.titles.length ? copy.titles : a.titles,
            bodies: copy.bodies.length ? copy.bodies : a.bodies,
            pageId: a.pageId || resolvedMeta?.publish.pageId || "",
            linkUrl: a.linkUrl || resolvedMeta?.publish.linkUrl || "",
            pixelId: a.pixelId ?? resolvedMeta?.settings.metaPixelId ?? null,
            leadFormId: a.leadFormId ?? resolvedMeta?.settings.metaLeadFormId ?? null,
            instagramActorId:
              a.instagramActorId ?? resolvedMeta?.settings.instagramActorId ?? null
          }
        : a
    )
  };

  const rationale: AiCampaignRationale = {
    summary: strategy.rationale,
    signals: signals.slice(0, 6).map(signalLabel),
    audienceReason: strategy.audienceReason,
    copyReason: strategy.copyReason
  };

  draft.meta = {
    ...draft.meta,
    creationMode: "ai",
    aiGeneratedAt: new Date().toISOString(),
    aiStrategy: strategy.strategy,
    aiRationale: rationale,
    referenceCampaignId: refId ?? undefined,
    suggestedAudiences: suggestedAudiences.length ? suggestedAudiences : undefined
  };

  const validationWarning = validatePublishDraft(draft);

  const draftName = isEn
    ? `AI — ${strategy.campaignName}`
    : `IA — ${strategy.campaignName}`;

  return {
    draft,
    draftName,
    strategy: strategy.strategy,
    rationale,
    referenceCampaignId: refId ?? undefined,
    suggestedAudiences,
    validationWarning,
    modelMeta: {
      modelUsed: strategyResult.modelUsed,
      provider
    }
  };
}

export async function saveAiCampaignTemplate(args: {
  tenantId: string;
  clientId: string;
  draftName: string;
  draft: CampaignDraftPayload;
}) {
  const { campaignTemplate: repo } = await repositories();
  const template = await repo.save(
    repo.create({
      tenantId: args.tenantId,
      clientId: args.clientId,
      name: args.draftName,
      payload: args.draft
    })
  );
  return template;
}
