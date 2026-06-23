import { z } from "zod";

import { coercePlacements, defaultPlacements, defaultScheduleStartLocal, type PlacementConfig } from "@/lib/campaign-placements";
import { defaultUtm, type UtmFields } from "@/lib/campaign-utm";
import { validateAdCreativeForMeta } from "@/lib/meta-ad-creative";
import { normalizeMessageTemplateDraft } from "@/lib/meta-welcome-message";

export const CAMPAIGN_OBJECTIVES = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "app",
  "sales"
] as const;

export type CampaignObjectiveKey = (typeof CAMPAIGN_OBJECTIVES)[number];

/** Suggested pixel event when the user has not picked one yet (empty = neutral). */
export function defaultConversionEventForObjective(objective: CampaignObjectiveKey): string {
  if (objective === "leads") return "std:LEAD";
  if (objective === "sales") return "std:PURCHASE";
  return "";
}

export function defaultConversionLocationForObjective(
  objective: CampaignObjectiveKey
): ConversionLocation {
  if (objective === "leads") return "website_and_form";
  if (objective === "sales") return "website";
  return "website";
}

export const RESERVATION_OBJECTIVES = ["awareness", "engagement"] as const;

export type BuyingType = "auction" | "reservation";

export type CreatorNode = "campaign" | "adset" | "ad" | "review";

export type AdAssignmentMode = "single" | "all_adsets";

export type VariationAxis = "location" | "ageRange" | "customAudience" | "interests" | "gender";

export const MessagingChannelSchema = z.enum(["whatsapp", "messenger", "instagram"]);
export type MessagingChannel = z.infer<typeof MessagingChannelSchema>;

export const ConversionLocationSchema = z.enum([
  "website",
  "instant_form",
  "website_and_form",
  "messaging",
  "calls",
  "app"
]);
export type ConversionLocation = z.infer<typeof ConversionLocationSchema>;

export const PlacementConfigSchema = z.object({
  mode: z.enum(["advantage_plus", "manual"]).default("advantage_plus"),
  platforms: z.array(z.enum(["facebook", "instagram", "audience_network", "messenger"])).default([]),
  positions: z.array(z.string()).default([]),
  devices: z.array(z.enum(["mobile", "desktop"])).default([])
});

export const MessageTemplateDraftSchema = z.object({
  channel: MessagingChannelSchema,
  templateId: z.string().nullable().default(null),
  greeting: z.string().default(""),
  icebreakers: z.array(z.string()).default([])
});

export const UtmFieldsSchema = z.object({
  source: z.string().default("facebook"),
  medium: z.string().default("paid"),
  campaign: z.string().default(""),
  content: z.string().default(""),
  term: z.string().default("")
});

export const TargetingItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  meta: z
    .object({
      type: z.string().optional(),
      countryCode: z.string().optional(),
      kind: z.string().optional(),
      bucket: z.string().optional(),
      radius: z.number().optional(),
      distanceUnit: z.enum(["mile", "kilometer"]).optional()
    })
    .optional()
});

export type TargetingItem = z.infer<typeof TargetingItemSchema>;

export const DetailedTargetingGroupSchema = z.object({
  items: z.array(TargetingItemSchema).default([])
});

export const DraftTargetingSchema = z.object({
  locations: z.array(TargetingItemSchema).default([]),
  ageMin: z.number().min(13).max(65).default(18),
  ageMax: z.number().min(13).max(65).default(65),
  gender: z.enum(["all", "male", "female"]).default("all"),
  interests: z.array(TargetingItemSchema).default([]),
  locales: z.array(TargetingItemSchema).default([]),
  customAudienceIds: z.array(z.string()).default([]),
  excludedAudienceIds: z.array(z.string()).default([]),
  detailedGroups: z.array(DetailedTargetingGroupSchema).default([]),
  advantageAudience: z.boolean().default(false)
});

export const AdSetDraftItemSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  conversionLocation: ConversionLocationSchema.default("website_and_form"),
  messagingChannels: z.array(MessagingChannelSchema).default([]),
  pixelId: z.string().nullable().default(null),
  conversionEvent: z.string().default(""),
  dynamicCreative: z.boolean().default(true),
  schedule: z.object({
    start: z.string().nullable().default(null),
    end: z.string().nullable().default(null)
  }),
  targeting: DraftTargetingSchema,
  placements: PlacementConfigSchema.default(defaultPlacements()),
  variantLabel: z.string().optional()
});

export const AdDraftItemSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  pageId: z.string().default(""),
  instagramActorId: z.string().nullable().default(null),
  pixelId: z.string().nullable().default(null),
  format: z.enum(["single_image", "video"]).default("single_image"),
  imageHashes: z.array(z.string()).default([]),
  videoIds: z.array(z.string()).default([]),
  titles: z.array(z.string()).default([]),
  bodies: z.array(z.string()).default([]),
  destinationType: z.enum(["website", "instant_form", "whatsapp"]).default("website"),
  linkUrl: z.string().default(""),
  leadFormId: z.string().nullable().default(null),
  urlParams: z.string().default(""),
  utm: UtmFieldsSchema.default(defaultUtm()),
  callToAction: z.string().default(""),
  whatsappWelcomeMessage: z.string().nullable().default(null),
  messageTemplate: MessageTemplateDraftSchema.nullable().default(null),
  /** Meta ad creative id — when reuseMetaCreative is true, publish links this creative instead of creating a new post. */
  metaCreativeId: z.string().nullable().default(null),
  sourceMetaAdId: z.string().nullable().default(null),
  reuseMetaCreative: z.boolean().default(false),
  targetAdsetIds: z.array(z.string()).default(["__all__"]),
  tracking: z.object({
    websiteEvents: z.boolean().default(false),
    appEvents: z.boolean().default(false),
    offlineEvents: z.boolean().default(false)
  })
});

export const AdSetBatchSchema = z.object({
  enabled: z.boolean().default(false),
  extraCount: z.number().min(0).max(10).default(0),
  variationAxes: z.array(z.enum(["location", "ageRange", "customAudience", "interests", "gender"])).default([]),
  locationVariants: z.array(TargetingItemSchema).default([]),
  ageRanges: z
    .array(z.object({ label: z.string(), ageMin: z.number(), ageMax: z.number() }))
    .default([]),
  audienceVariants: z.array(z.array(z.string())).default([]),
  interestVariants: z.array(z.array(TargetingItemSchema)).default([]),
  genderVariants: z.array(z.enum(["all", "male", "female"])).default([])
});

export const CampaignDraftPayloadV2Schema = z.object({
  version: z.literal(2),
  clientSlug: z.string().default(""),
  adAccountId: z.string().default(""),
  buyingType: z.enum(["auction", "reservation"]).default("auction"),
  objective: z.enum(CAMPAIGN_OBJECTIVES).default("leads"),
  copyFromCampaignEnabled: z.boolean().default(false),
  copyFromCampaignId: z.string().nullable().default(null),
  visitedNodes: z.array(z.enum(["campaign", "adset", "ad", "review"])).default(["campaign"]),
  activeAdsetId: z.string().nullable().default(null),
  activeAdId: z.string().nullable().default(null),
  adAssignment: z.enum(["single", "all_adsets"]).default("all_adsets"),
  selectedAdsetIdForAds: z.string().nullable().default(null),
  campaign: z.object({
    name: z.string().default(""),
    budgetLevel: z.enum(["campaign", "adset"]).default("adset"),
    dailyBudgetBRL: z.number().positive().default(150),
    bidStrategy: z.enum(["lowest_cost"]).default("lowest_cost"),
    specialAdCategories: z.array(z.string()).default([]),
    abTestEnabled: z.boolean().default(false)
  }),
  adsetBatch: AdSetBatchSchema,
  adsets: z.array(AdSetDraftItemSchema).min(1),
  ads: z.array(AdDraftItemSchema).min(1),
  meta: z
    .object({
      campaignId: z.string().optional(),
      adsetIds: z.array(z.string()).optional(),
      adIds: z.array(z.string()).optional(),
      publishedAt: z.string().optional(),
      publishMode: z.enum(["add_ad", "add_adset"]).optional(),
      targetMetaAdsetId: z.string().optional(),
      targetMetaCampaignId: z.string().optional(),
      targetAdsetName: z.string().optional(),
      inheritedContextLocked: z.boolean().optional(),
      creationMode: z.enum(["manual", "ai"]).optional(),
      aiGeneratedAt: z.string().optional(),
      aiStrategy: z
        .enum(["scale_winner", "new_audience_test", "creative_refresh"])
        .optional(),
      aiRationale: z
        .object({
          summary: z.string(),
          signals: z.array(z.string()),
          audienceReason: z.string(),
          copyReason: z.string()
        })
        .optional(),
      referenceCampaignId: z.string().optional(),
      suggestedAudiences: z
        .array(
          z.object({
            type: z.string(),
            name: z.string(),
            reason: z.string()
          })
        )
        .optional()
    })
    .optional()
});

export type CampaignDraftPayload = z.infer<typeof CampaignDraftPayloadV2Schema>;
export type AdSetDraftItem = z.infer<typeof AdSetDraftItemSchema>;
export type AdDraftItem = z.infer<typeof AdDraftItemSchema>;
export type DraftTargeting = z.infer<typeof DraftTargetingSchema>;
export type AdSetBatchConfig = z.infer<typeof AdSetBatchSchema>;
export type PlacementConfigDraft = PlacementConfig;
export type UtmFieldsDraft = UtmFields;

export function newDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultTargeting(): DraftTargeting {
  return {
    locations: [],
    ageMin: 18,
    ageMax: 65,
    gender: "all",
    interests: [],
    locales: [],
    customAudienceIds: [],
    excludedAudienceIds: [],
    detailedGroups: [],
    advantageAudience: false
  };
}

export function defaultAdSetItem(
  locale: string,
  name?: string,
  objective: CampaignObjectiveKey = "traffic"
): AdSetDraftItem {
  const isEn = locale === "en";
  return {
    id: newDraftId(),
    name: name ?? (isEn ? "New Ad Set" : "Novo conjunto de anúncios"),
    conversionLocation: defaultConversionLocationForObjective(objective),
    messagingChannels: [],
    pixelId: null,
    conversionEvent: defaultConversionEventForObjective(objective),
    dynamicCreative: true,
    schedule: { start: defaultScheduleStartLocal(), end: null },
    targeting: defaultTargeting(),
    placements: defaultPlacements()
  };
}

export function defaultAdItem(locale: string, name?: string): AdDraftItem {
  const isEn = locale === "en";
  return {
    id: newDraftId(),
    name: name ?? (isEn ? "New Ad" : "Novo anúncio"),
    pageId: "",
    instagramActorId: null,
    pixelId: null,
    format: "single_image",
    imageHashes: [],
    videoIds: [],
    titles: isEn
      ? ["Perfect smile in 30 days", "Dental implants — free evaluation"]
      : ["Sorriso perfeito em 30 dias", "Implantes com avaliação"],
    bodies: isEn
      ? ["Special offer for first visit.", "Expert team and human care."]
      : ["Condições especiais para primeira consulta.", "Equipe especialista."],
    destinationType: "website",
    linkUrl: "",
    leadFormId: null,
    urlParams: "",
    utm: defaultUtm(),
    callToAction: "",
    whatsappWelcomeMessage: null,
    messageTemplate: null,
    metaCreativeId: null,
    sourceMetaAdId: null,
    reuseMetaCreative: false,
    targetAdsetIds: ["__all__"],
    tracking: { websiteEvents: false, appEvents: false, offlineEvents: false }
  };
}

export function defaultCampaignDraft(locale: string): CampaignDraftPayload {
  const isEn = locale === "en";
  const defaultObjective: CampaignObjectiveKey = "traffic";
  const adset = defaultAdSetItem(locale, undefined, defaultObjective);
  const ad = defaultAdItem(locale);
  return CampaignDraftPayloadV2Schema.parse({
    version: 2,
    clientSlug: "",
    adAccountId: "",
    buyingType: "auction",
    objective: defaultObjective,
    copyFromCampaignEnabled: false,
    copyFromCampaignId: null,
    visitedNodes: ["campaign"],
    activeAdsetId: adset.id,
    activeAdId: ad.id,
    adAssignment: "all_adsets",
    selectedAdsetIdForAds: null,
    campaign: {
      name: isEn ? "New Campaign" : "Nova campanha",
      budgetLevel: "adset",
      dailyBudgetBRL: 150,
      bidStrategy: "lowest_cost",
      specialAdCategories: [],
      abTestEnabled: false
    },
    adsetBatch: {
      enabled: false,
      extraCount: 0,
      variationAxes: [],
      locationVariants: [],
      ageRanges: [],
      audienceVariants: [],
      interestVariants: [],
      genderVariants: []
    },
    adsets: [adset],
    ads: [ad]
  });
}

const V1Schema = z.object({
  version: z.literal(1),
  clientSlug: z.string().optional(),
  adAccountId: z.string().optional(),
  buyingType: z.enum(["auction", "reservation"]).optional(),
  objective: z.enum(CAMPAIGN_OBJECTIVES).optional(),
  visitedNodes: z.array(z.string()).optional(),
  campaign: z.record(z.string(), z.unknown()).optional(),
  adset: z.record(z.string(), z.unknown()).optional(),
  ad: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional()
});

export function migrateV1ToV2(raw: z.infer<typeof V1Schema>, locale: string): CampaignDraftPayload {
  const base = defaultCampaignDraft(locale);
  const adsetId = newDraftId();
  const adId = newDraftId();
  const v1Adset = (raw.adset ?? {}) as Record<string, unknown>;
  const v1Ad = (raw.ad ?? {}) as Record<string, unknown>;
  const v1Campaign = (raw.campaign ?? {}) as Record<string, unknown>;

  return CampaignDraftPayloadV2Schema.parse({
    ...base,
    clientSlug: raw.clientSlug ?? "",
    adAccountId: raw.adAccountId ?? "",
    buyingType: raw.buyingType ?? "auction",
    objective: raw.objective ?? "leads",
    visitedNodes: raw.visitedNodes ?? ["campaign"],
    activeAdsetId: adsetId,
    activeAdId: adId,
    campaign: { ...base.campaign, ...v1Campaign },
    adsets: [
      {
        id: adsetId,
        name: String(v1Adset.name ?? base.adsets[0]!.name),
        conversionLocation: v1Adset.conversionLocation ?? "website_and_form",
        messagingChannels: [],
        pixelId: null,
        conversionEvent:
          typeof v1Adset.conversionEvent === "string"
            ? v1Adset.conversionEvent
            : defaultConversionEventForObjective(raw.objective ?? "traffic"),
        dynamicCreative: v1Adset.dynamicCreative ?? true,
        schedule: v1Adset.schedule ?? { start: null, end: null },
        targeting: v1Adset.targeting ?? defaultTargeting(),
        placements: coercePlacements(v1Adset.placements)
      }
    ],
    ads: [
      {
        id: adId,
        name: String(v1Ad.name ?? base.ads[0]!.name),
        pageId: String(v1Ad.pageId ?? ""),
        instagramActorId: (v1Ad.instagramActorId as string | null) ?? null,
        pixelId: (v1Ad.pixelId as string | null) ?? null,
        format: v1Ad.format ?? "single_image",
        imageHashes: (v1Ad.imageHashes as string[]) ?? [],
        videoIds: (v1Ad.videoIds as string[]) ?? [],
        titles: (v1Ad.titles as string[]) ?? [],
        bodies: (v1Ad.bodies as string[]) ?? [],
        destinationType: v1Ad.destinationType ?? "website",
        linkUrl: String(v1Ad.linkUrl ?? ""),
        leadFormId: (v1Ad.leadFormId as string | null) ?? null,
        urlParams: String(v1Ad.urlParams ?? ""),
        utm: defaultUtm(),
        callToAction: String(v1Ad.callToAction ?? ""),
        whatsappWelcomeMessage: (v1Ad.whatsappWelcomeMessage as string | null) ?? null,
        messageTemplate: v1Ad.whatsappWelcomeMessage
          ? {
              channel: "whatsapp" as const,
              templateId: null,
              greeting: String(v1Ad.whatsappWelcomeMessage),
              icebreakers: []
            }
          : null,
        targetAdsetIds: ["__all__"],
        tracking: v1Ad.tracking ?? { websiteEvents: false, appEvents: false, offlineEvents: false }
      }
    ],
    meta: raw.meta
  });
}

function coerceDraftPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  if (Array.isArray(obj.adsets)) {
    obj.adsets = obj.adsets.map((a) => {
      if (!a || typeof a !== "object") return a;
      const adset = { ...(a as Record<string, unknown>) };
      adset.placements = coercePlacements(adset.placements);
      if (adset.targeting && typeof adset.targeting === "object") {
        const t = { ...(adset.targeting as Record<string, unknown>) };
        if (!Array.isArray(t.detailedGroups)) t.detailedGroups = [];
        if (typeof t.advantageAudience !== "boolean") t.advantageAudience = false;
        adset.targeting = t;
      }
      if (!Array.isArray(adset.messagingChannels)) adset.messagingChannels = [];
      if (adset.pixelId === undefined) adset.pixelId = null;
      return adset;
    });
  }
  if (Array.isArray(obj.ads)) {
    obj.ads = obj.ads.map((a) => {
      if (!a || typeof a !== "object") return a;
      const ad = { ...(a as Record<string, unknown>) };
      if (!ad.utm || typeof ad.utm !== "object") ad.utm = defaultUtm();
      if (ad.messageTemplate === undefined) {
        const welcome = ad.whatsappWelcomeMessage;
        ad.messageTemplate =
          typeof welcome === "string" && welcome.trim()
            ? { channel: "whatsapp", templateId: null, greeting: welcome.trim(), icebreakers: [] }
            : null;
      }
      if (ad.messageTemplate && typeof ad.messageTemplate === "object") {
        ad.messageTemplate = normalizeMessageTemplateDraft(
          ad.messageTemplate as {
            channel: "whatsapp" | "messenger" | "instagram";
            templateId: string | null;
            greeting: string;
            icebreakers: string[];
          }
        );
        const mt = ad.messageTemplate as { greeting?: string };
        if (typeof mt?.greeting === "string") {
          ad.whatsappWelcomeMessage = mt.greeting.trim() || null;
        }
      }
      return ad;
    });
  }
  return obj;
}

export function parseCampaignDraftPayload(raw: unknown): CampaignDraftPayload {
  if (raw && typeof raw === "object" && (raw as { version?: number }).version === 1) {
    return migrateV1ToV2(V1Schema.parse(raw), "pt-BR");
  }
  return CampaignDraftPayloadV2Schema.parse(coerceDraftPayload(raw));
}

export function objectivesForBuyingType(buyingType: BuyingType): CampaignObjectiveKey[] {
  if (buyingType === "reservation") {
    return [...RESERVATION_OBJECTIVES];
  }
  return [...CAMPAIGN_OBJECTIVES];
}

export function getActiveAdset(d: CampaignDraftPayload): AdSetDraftItem {
  const id = d.activeAdsetId ?? d.adsets[0]?.id;
  return d.adsets.find((a) => a.id === id) ?? d.adsets[0]!;
}

export function getActiveAd(d: CampaignDraftPayload): AdDraftItem {
  const id = d.activeAdId ?? d.ads[0]?.id;
  return d.ads.find((a) => a.id === id) ?? d.ads[0]!;
}

export function resolveAdTargetAdsets(d: CampaignDraftPayload, ad: AdDraftItem): AdSetDraftItem[] {
  if (ad.targetAdsetIds.includes("__all__")) return d.adsets;
  return d.adsets.filter((a) => ad.targetAdsetIds.includes(a.id));
}

export function countPublishEntities(d: CampaignDraftPayload): {
  adsets: number;
  ads: number;
  creatives: number;
} {
  let ads = 0;
  for (const ad of d.ads) {
    ads += resolveAdTargetAdsets(d, ad).length;
  }
  return { adsets: d.adsets.length, ads, creatives: ads };
}

export function buildAdSetVariants(
  base: AdSetDraftItem,
  batch: AdSetBatchConfig,
  baseName: string
): AdSetDraftItem[] {
  const results: AdSetDraftItem[] = [{ ...base, name: base.name || baseName }];

  if (!batch.enabled || batch.extraCount <= 0) return results;

  const axes = batch.variationAxes;
  const variants: Partial<AdSetDraftItem>[] = [];

  if (axes.includes("location") && batch.locationVariants.length > 0) {
    for (const loc of batch.locationVariants) {
      variants.push({
        variantLabel: loc.label,
        name: `${baseName} — ${loc.label}`,
        targeting: {
          ...base.targeting,
          locations: [loc, ...base.targeting.locations.filter((l) => l.value !== loc.value)]
        }
      });
    }
  }

  if (axes.includes("ageRange") && batch.ageRanges.length > 0) {
    for (const range of batch.ageRanges) {
      variants.push({
        variantLabel: range.label,
        name: `${baseName} — ${range.label}`,
        targeting: {
          ...base.targeting,
          ageMin: range.ageMin,
          ageMax: range.ageMax
        }
      });
    }
  }

  if (axes.includes("customAudience") && batch.audienceVariants.length > 0) {
    for (const audIds of batch.audienceVariants) {
      const label = audIds.length === 1 ? `Público ${audIds[0]!.slice(-6)}` : `${audIds.length} públicos`;
      variants.push({
        variantLabel: label,
        name: `${baseName} — ${label}`,
        targeting: { ...base.targeting, customAudienceIds: audIds }
      });
    }
  }

  if (axes.includes("interests") && batch.interestVariants.length > 0) {
    for (const ints of batch.interestVariants) {
      const label = ints[0]?.label ?? "Interesses";
      variants.push({
        variantLabel: label,
        name: `${baseName} — ${label}`,
        targeting: { ...base.targeting, interests: ints }
      });
    }
  }

  if (axes.includes("gender") && batch.genderVariants.length > 0) {
    for (const g of batch.genderVariants) {
      const label = g === "all" ? "Todos" : g === "male" ? "Masculino" : "Feminino";
      variants.push({
        variantLabel: label,
        name: `${baseName} — ${label}`,
        targeting: { ...base.targeting, gender: g }
      });
    }
  }

  const needed = batch.extraCount;
  const picked = variants.slice(0, needed);
  while (picked.length < needed) {
    const i = picked.length + 1;
    picked.push({ variantLabel: `Variação ${i}`, name: `${baseName} — Variação ${i}` });
  }

  for (const v of picked) {
    results.push({
      ...base,
      id: newDraftId(),
      name: v.name ?? `${baseName} — Extra`,
      variantLabel: v.variantLabel,
      targeting: v.targeting ?? { ...base.targeting }
    });
  }

  return results;
}

export function syncAdsetsFromBatch(d: CampaignDraftPayload): CampaignDraftPayload {
  if (!d.adsetBatch.enabled || d.adsetBatch.extraCount <= 0) {
    const primary = getActiveAdset(d);
    return { ...d, adsets: [primary] };
  }
  const base = getActiveAdset(d);
  const built = buildAdSetVariants(base, d.adsetBatch, d.campaign.name || base.name);
  const activeId = d.activeAdsetId && built.some((a) => a.id === d.activeAdsetId)
    ? d.activeAdsetId
    : built[0]!.id;
  return { ...d, adsets: built, activeAdsetId: activeId };
}

export function draftTargetingToApi(t: DraftTargeting) {
  const countries = t.locations
    .filter((l) => l.meta?.type === "country")
    .map((l) => l.meta?.countryCode ?? l.value);
  const cities = t.locations
    .filter((l) => l.meta?.type === "city" || l.meta?.type === "region")
    .map((l) => ({
      key: l.value,
      radius: l.meta?.radius,
      distanceUnit: l.meta?.distanceUnit
    }));
  const genders = t.gender === "male" ? [1] : t.gender === "female" ? [2] : undefined;
  const locales = t.locales.map((l) => Number(l.value)).filter((n) => !Number.isNaN(n));

  const flexibleSpecs =
    t.detailedGroups.length > 0
      ? t.detailedGroups.map((group) => {
          const spec: Record<string, Array<{ id: string; name?: string }>> = {};
          for (const item of group.items) {
            const kind = item.meta?.kind ?? "interest";
            const bucket =
              kind === "behavior"
                ? "behaviors"
                : kind === "demographic"
                  ? typeof item.meta?.bucket === "string" && item.meta.bucket
                    ? item.meta.bucket
                    : "life_events"
                  : "interests";
            if (!spec[bucket]) spec[bucket] = [];
            spec[bucket]!.push({ id: item.value, name: item.label });
          }
          return spec;
        })
      : undefined;

  const interests = t.interests.map((i) => ({ id: i.value, name: i.label }));
  return {
    countries: countries.length ? countries : undefined,
    cities: cities.length ? cities : undefined,
    ageMin: t.ageMin,
    ageMax: t.ageMax,
    genders,
    locales: locales.length ? locales : undefined,
    interests: flexibleSpecs ? undefined : interests.length ? interests : undefined,
    flexibleSpecs,
    advantageAudience: t.advantageAudience || undefined,
    customAudienceIds: t.customAudienceIds.length ? t.customAudienceIds : undefined,
    excludedAudienceIds: t.excludedAudienceIds.length ? t.excludedAudienceIds : undefined
  };
}

export function validateCampaignStep(d: CampaignDraftPayload): string | null {
  if (!d.clientSlug.trim()) return "clientRequired";
  if (!d.adAccountId.trim()) return "adAccountRequired";
  if (!d.campaign.name.trim()) return "campaignNameRequired";
  if (d.campaign.dailyBudgetBRL < 1) return "budgetRequired";
  if (d.copyFromCampaignEnabled && !d.copyFromCampaignId) return "copyCampaignRequired";
  return null;
}

export function validateAdSetStep(d: CampaignDraftPayload): string | null {
  for (const adset of d.adsets) {
    if (!adset.name.trim()) return "adsetNameRequired";
    const t = adset.targeting;
    if (!t.locations.length && !t.customAudienceIds.length) return "audienceRequired";
    if (
      (adset.conversionLocation === "website" || adset.conversionLocation === "website_and_form") &&
      (d.objective === "leads" || d.objective === "sales") &&
      !adset.pixelId
    ) {
      return "pixelRequired";
    }
    if (
      adset.pixelId &&
      (d.objective === "leads" || d.objective === "sales") &&
      (adset.conversionLocation === "website" || adset.conversionLocation === "website_and_form") &&
      !adset.conversionEvent.trim()
    ) {
      return "conversionEventRequired";
    }
    if (adset.conversionLocation === "messaging" && !adset.messagingChannels.length) {
      return "messagingChannelRequired";
    }
  }
  return null;
}

export function isAddAdDraft(d: CampaignDraftPayload): boolean {
  return d.meta?.publishMode === "add_ad";
}

export function isAddAdsetDraft(d: CampaignDraftPayload): boolean {
  return d.meta?.publishMode === "add_adset";
}

export function isInheritedCampaignDraft(d: CampaignDraftPayload): boolean {
  return isAddAdDraft(d) || isAddAdsetDraft(d);
}

export function validatePublishDraft(d: CampaignDraftPayload): string | null {
  if (isAddAdDraft(d)) {
    if (!d.clientSlug.trim()) return "clientRequired";
    if (!d.adAccountId.trim()) return "adAccountRequired";
    return validateAdStep(d);
  }
  if (isAddAdsetDraft(d)) {
    if (!d.clientSlug.trim()) return "clientRequired";
    if (!d.adAccountId.trim()) return "adAccountRequired";
    return validateAdSetStep(d) ?? validateAdStep(d);
  }
  return (
    validateCampaignStep(d) ?? validateAdSetStep(d) ?? validateAdStep(d)
  );
}

export function adHasMedia(ad: AdDraftItem): boolean {
  return ad.format === "video" ? ad.videoIds.length > 0 : ad.imageHashes.length > 0;
}

export function validateAdStep(d: CampaignDraftPayload): string | null {
  for (const ad of d.ads) {
    if (!ad.name.trim()) return "adNameRequired";
    if (!ad.pageId.trim()) return "pageRequired";
    const creativeErr = validateAdCreativeForMeta(ad);
    if (creativeErr) return creativeErr;
    if (d.objective === "leads" && ad.destinationType === "instant_form") {
      if (!ad.leadFormId) return "leadFormRequired";
    } else if (ad.destinationType === "whatsapp" || ad.destinationType === "instant_form") {
      /* ok */
    } else if (!ad.linkUrl.trim()) {
      return "linkUrlRequired";
    }
    const adset = d.adsets.find((s) => s.id === d.activeAdsetId) ?? d.adsets[0];
    if (adset?.conversionLocation === "messaging" && !ad.messageTemplate?.greeting?.trim()) {
      return "messageTemplateRequired";
    }
  }
  return null;
}

export function computeDraftScore(d: CampaignDraftPayload): number {
  const checks = [
    !validateCampaignStep(d),
    !validateAdSetStep(d),
    !validateAdStep(d),
    d.ads.some(adHasMedia),
    d.ads.some((a) => a.titles.filter((x) => x.trim()).length >= 2)
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export const CREATOR_NODE_ORDER: CreatorNode[] = ["campaign", "adset", "ad", "review"];

export function nextNode(node: CreatorNode): CreatorNode | null {
  const i = CREATOR_NODE_ORDER.indexOf(node);
  return i < CREATOR_NODE_ORDER.length - 1 ? CREATOR_NODE_ORDER[i + 1]! : null;
}

export function prevNode(node: CreatorNode): CreatorNode | null {
  const i = CREATOR_NODE_ORDER.indexOf(node);
  return i > 0 ? CREATOR_NODE_ORDER[i - 1]! : null;
}

/** @deprecated use CampaignDraftPayloadV2Schema */
export const CampaignDraftPayloadSchema = CampaignDraftPayloadV2Schema;
