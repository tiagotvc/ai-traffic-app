import "server-only";

import { z } from "zod";

import type { AiCampaignRationale } from "@/lib/campaign-creator/ai-campaign-orchestrator";
import { AiCampaignWizardGenerateSchema } from "@/lib/campaign-creator/ai-campaign-wizard-types";
import {
  applySuggestionToDraftTargeting,
  type AudiencePersonaPreview,
  type AudienceTargetingSuggestion
} from "@/lib/audience-targeting-shared";
import { AudienceTargetingBriefSchema } from "@/lib/audience-targeting-ai";
import { generateAdCopy } from "@/lib/campaign-creator-ai";
import {
  audienceLabelFromWizardInput,
  buildOrionAiCampaignNames,
  zoneLabelFromWizardInput
} from "@/lib/campaign-creator/ai-wizard-naming";
import {
  defaultAdItem,
  defaultAdSetItem,
  defaultCampaignDraft,
  defaultConversionEventForObjective,
  newDraftId,
  type CampaignDraftPayload,
  type CampaignObjectiveKey
} from "@/lib/campaign-draft";
import { getResolvedClientMeta } from "@/lib/client-meta-settings";
import { getGeminiApiKey } from "@/lib/creative-memory/ai-usage";
import { llmGenerateJson } from "@/lib/llm/generate-json";
import type { LlmProviderId } from "@/lib/llm/types";
import { enrichTargetingWithMetaNames } from "@/lib/meta-segment-replacement";
import { finalizeFlexibleSpecTargeting } from "@/lib/meta-targeting-prune";
import { createUserPersona, createUserZone, getUserPersona, getUserZone } from "@/lib/user-persona-zone";
import type { ZoneGeoRules } from "@/db/entities/UserZone";
import { fetchCustomAudiences } from "@/lib/meta-graph";

const MatchResultSchema = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      source: z.enum(["persona", "meta"]),
      name: z.string(),
      score: z.number().min(0).max(100),
      reason: z.string()
    })
  )
});

export async function matchAudiencesForWizard(args: {
  tenantId: string;
  userId: string;
  accessToken: string;
  adAccountId: string;
  businessDescription: string;
  targetProfile: string;
  provider?: LlmProviderId;
}): Promise<{
  personaSuggestions: Array<{ id: string; source: "persona"; name: string; score: number; reason: string }>;
  metaAudienceSuggestions: Array<{ id: string; source: "meta"; name: string; score: number; reason: string }>;
}> {
  const provider = args.provider ?? "claude";
  const [personas, customAudiences] = await Promise.all([
    import("@/lib/user-persona-zone").then((m) =>
      m.listUserPersonas({ tenantId: args.tenantId, userId: args.userId })
    ),
    fetchCustomAudiences(args.accessToken, args.adAccountId).catch(() => [])
  ]);

  const catalog = [
    ...personas.slice(0, 20).map((p) => ({
      id: p.id,
      source: "persona" as const,
      name: p.name,
      hint: (p.description ?? p.sourcePrompt ?? "").slice(0, 200)
    })),
    ...customAudiences.slice(0, 20).map((a) => ({
      id: a.id,
      source: "meta" as const,
      name: a.name,
      hint: a.subtype ?? ""
    }))
  ];

  if (!catalog.length) {
    return { personaSuggestions: [], metaAudienceSuggestions: [] };
  }

  const result = await llmGenerateJson({
    provider,
    prompt: [
      "Ranqueie os públicos abaixo por aderência ao brief de campanha.",
      "Retorne até 5 matches com score 0-100 e reason curto em português.",
      "Brief:",
      `Negócio: ${args.businessDescription}`,
      `Público-alvo: ${args.targetProfile}`,
      "",
      "Catálogo:",
      JSON.stringify(catalog)
    ].join("\n"),
    schema: MatchResultSchema,
    temperature: 0.2
  });

  const personaSuggestions = result.data.matches
    .filter((m) => m.source === "persona")
    .slice(0, 5)
    .map((m) => ({ ...m, source: "persona" as const }));
  const metaAudienceSuggestions = result.data.matches
    .filter((m) => m.source === "meta")
    .slice(0, 5)
    .map((m) => ({ ...m, source: "meta" as const }));

  return { personaSuggestions, metaAudienceSuggestions };
}

async function resolvePersonaId(args: {
  tenantId: string;
  userId: string;
  accessToken: string;
  adAccountId: string;
  clientSlug: string;
  body: z.infer<typeof AiCampaignWizardGenerateSchema>;
  provider: LlmProviderId;
}): Promise<string | null> {
  if (args.body.selectedPersonaId) {
    const existing = await getUserPersona({
      tenantId: args.tenantId,
      userId: args.userId,
      id: args.body.selectedPersonaId
    });
    return existing?.id ?? null;
  }

  const preview = args.body.audiencePreview as AudiencePersonaPreview | null | undefined;
  const suggestion = args.body.targetingSuggestion as AudienceTargetingSuggestion | null | undefined;
  if (!preview || !suggestion) return null;

  const brief = AudienceTargetingBriefSchema.parse({
    businessDescription: args.body.businessDescription ?? "",
    targetProfile: args.body.targetProfile ?? "",
    countries: ["BR"],
    includeCustomAudienceIds: [],
    excludeCustomAudienceIds: [],
    rejectedSegmentIds: [],
    rejectedSegments: []
  });

  const personaTargeting = { ...suggestion.targeting };
  delete personaTargeting.geo_locations;
  delete personaTargeting.custom_audiences;
  delete personaTargeting.excluded_custom_audiences;

  const { targeting: validatedTargeting } = await finalizeFlexibleSpecTargeting(
    personaTargeting,
    args.accessToken,
    args.adAccountId
  );
  const namedTargeting = await enrichTargetingWithMetaNames(
    validatedTargeting,
    args.accessToken,
    args.adAccountId
  );

  const saved = await createUserPersona({
    tenantId: args.tenantId,
    userId: args.userId,
    name: suggestion.name || preview.personaName || suggestion.title,
    description: suggestion.summary,
    ageMin: brief.ageMin ?? 18,
    ageMax: brief.ageMax ?? 65,
    gender: preview.suggestedGender ?? brief.gender ?? "all",
    targeting: namedTargeting,
    sourcePrompt: [brief.businessDescription, brief.targetProfile].filter(Boolean).join("\n")
  });
  return saved.id;
}

async function resolveZoneId(args: {
  tenantId: string;
  userId: string;
  body: z.infer<typeof AiCampaignWizardGenerateSchema>;
}): Promise<string | null> {
  if (args.body.selectedZoneId) {
    const zoneRow = await getUserZone({
      tenantId: args.tenantId,
      userId: args.userId,
      id: args.body.selectedZoneId
    });
    return zoneRow?.id ?? null;
  }

  const geoRules = args.body.zoneGeoRules as ZoneGeoRules | null | undefined;
  if (!geoRules) return null;

  const saved = await createUserZone({
    tenantId: args.tenantId,
    userId: args.userId,
    name: args.body.zoneResolvedName ?? args.body.zonePreview?.zoneName ?? "Região IA",
    description: args.body.zonePreview?.summary ?? args.body.regionsDescription ?? null,
    geoRules,
    sourcePrompt: args.body.regionsDescription ?? null
  });
  return saved.id;
}

export async function generateAiCampaignFromWizard(args: {
  tenantId: string;
  userId: string;
  clientId: string;
  clientSlug: string;
  clientName: string;
  accessToken: string;
  body: z.infer<typeof AiCampaignWizardGenerateSchema>;
}): Promise<{
  draft: CampaignDraftPayload;
  draftName: string;
  rationale: AiCampaignRationale;
}> {
  const locale = args.body.locale;
  const isEn = locale.startsWith("en");
  const provider = args.body.provider as LlmProviderId;
  const objective = args.body.objective as CampaignObjectiveKey;
  const geminiApiKey = getGeminiApiKey() ?? "";

  const [resolvedMeta, personaId, zoneId] = await Promise.all([
    getResolvedClientMeta(args.tenantId, args.clientId),
    resolvePersonaId({
      tenantId: args.tenantId,
      userId: args.userId,
      accessToken: args.accessToken,
      adAccountId: args.body.adAccountId,
      clientSlug: args.body.clientSlug,
      body: args.body,
      provider
    }),
    resolveZoneId({
      tenantId: args.tenantId,
      userId: args.userId,
      body: args.body
    })
  ]);

  const preview = args.body.audiencePreview as AudiencePersonaPreview | null | undefined;
  const suggestion = args.body.targetingSuggestion as AudienceTargetingSuggestion | null | undefined;

  const [reusedPersona, reusedZone] = await Promise.all([
    args.body.selectedPersonaId
      ? getUserPersona({
          tenantId: args.tenantId,
          userId: args.userId,
          id: args.body.selectedPersonaId
        })
      : Promise.resolve(null),
    args.body.selectedZoneId
      ? getUserZone({
          tenantId: args.tenantId,
          userId: args.userId,
          id: args.body.selectedZoneId
        })
      : Promise.resolve(null)
  ]);

  const orionNames = buildOrionAiCampaignNames({
    productDescription: args.body.productDescription,
    objective,
    locale,
    audienceLabel: audienceLabelFromWizardInput({
      businessDescription: args.body.businessDescription,
      targetProfile: args.body.targetProfile,
      audiencePreviewName: preview?.personaName,
      targetingSuggestionName: suggestion?.name,
      reusedPersonaName: reusedPersona?.name
    }),
    zoneLabel: zoneLabelFromWizardInput({
      regionsDescription: args.body.regionsDescription,
      zoneResolvedName: args.body.zoneResolvedName,
      zonePreviewName: args.body.zonePreview?.zoneName,
      reusedZoneName: reusedZone?.name
    })
  });

  let draft = defaultCampaignDraft(locale);
  draft.clientSlug = args.clientSlug;
  draft.adAccountId = args.body.adAccountId;
  draft.buyingType = args.body.buyingType;
  draft.objective = objective;

  draft.campaign.name = orionNames.campaignName;
  draft.campaign.dailyBudgetBRL = args.body.dailyBudgetBRL;

  const adsetId = newDraftId();
  const adId = newDraftId();
  const baseAdset = defaultAdSetItem(locale, orionNames.adsetName);
  const baseAd = defaultAdItem(locale, isEn ? "Ad 1" : "Anúncio 1");

  const hasCompilerPair = !!(personaId && zoneId);
  const metaAudienceId = args.body.selectedMetaAudienceId ?? null;

  let adsetTargeting = baseAdset.targeting;
  if (suggestion && !personaId && !metaAudienceId) {
    adsetTargeting = applySuggestionToDraftTargeting(baseAdset.targeting, suggestion);
  }
  if (metaAudienceId) {
    adsetTargeting = {
      ...adsetTargeting,
      customAudienceIds: [metaAudienceId]
    };
  }

  draft.adsets = [
    {
      ...baseAdset,
      id: adsetId,
      name: orionNames.adsetName,
      targetingMode: hasCompilerPair ? "compiler" : metaAudienceId || suggestion ? "advanced" : "compiler",
      personaId: personaId ?? null,
      zoneId: zoneId ?? null,
      conversionLocation: args.body.conversionLocation,
      conversionEvent: defaultConversionEventForObjective(objective),
      messagingChannels: args.body.messagingChannels,
      targeting: adsetTargeting,
      pixelId: resolvedMeta?.settings.metaPixelId ?? baseAdset.pixelId
    }
  ];
  draft.ads = [{ ...baseAd, id: adId }];
  draft.activeAdsetId = adsetId;
  draft.activeAdId = adId;
  draft.visitedNodes = ["campaign", "adset", "ad"];

  const copy = await generateAdCopy({
    apiKey: geminiApiKey,
    prompt: args.body.productDescription,
    objective,
    locale,
    countTitles: 3,
    countBodies: 2,
    clientContext: args.clientName
  });

  const linkUrl =
    args.body.linkUrl.trim() ||
    resolvedMeta?.publish.linkUrl ||
    "";

  draft.ads = draft.ads.map((a, i) =>
    i === 0
      ? {
          ...a,
          titles: copy.titles.length ? copy.titles : a.titles,
          bodies: copy.bodies.length ? copy.bodies : a.bodies,
          linkUrl,
          pageId: a.pageId || resolvedMeta?.publish.pageId || "",
          pixelId: a.pixelId ?? resolvedMeta?.settings.metaPixelId ?? null,
          leadFormId: a.leadFormId ?? resolvedMeta?.settings.metaLeadFormId ?? null,
          instagramActorId: a.instagramActorId ?? resolvedMeta?.settings.instagramActorId ?? null,
          destinationType:
            args.body.conversionLocation === "messaging" ? "whatsapp" : a.destinationType,
          messageTemplate:
            args.body.conversionLocation === "messaging"
              ? {
                  channel: "whatsapp" as const,
                  templateId: null,
                  greeting: isEn ? "Hello! How can we help?" : "Olá! Como podemos ajudar?",
                  icebreakers: []
                }
              : a.messageTemplate
        }
      : a
  );

  const rationale: AiCampaignRationale = {
    summary: isEn
      ? "Campaign structured from your AI wizard inputs."
      : "Campanha estruturada com base nas escolhas do assistente de IA.",
    signals: [],
    audienceReason:
      personaId != null
        ? isEn
          ? "Reused or generated persona from your brief."
          : "Persona reaproveitada ou gerada a partir do seu brief."
        : args.body.businessDescription?.slice(0, 200) ?? "",
    copyReason: args.body.productDescription.slice(0, 200)
  };

  draft.meta = {
    ...draft.meta,
    creationMode: "ai",
    aiGeneratedAt: new Date().toISOString(),
    aiStrategy: "new_audience_test",
    aiRationale: rationale,
    wizardGenerated: true
  };

  const draftName = orionNames.draftName;

  return { draft, draftName, rationale };
}

export { AiCampaignWizardGenerateSchema };
