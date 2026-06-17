import { z } from "zod";

export const CAMPAIGN_OBJECTIVES = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "app",
  "sales"
] as const;

export type CampaignObjectiveKey = (typeof CAMPAIGN_OBJECTIVES)[number];

export type CreatorNode = "campaign" | "adset" | "ad" | "review";

export const TargetingItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  meta: z
    .object({
      type: z.string().optional(),
      countryCode: z.string().optional(),
      kind: z.string().optional()
    })
    .optional()
});

export const DraftTargetingSchema = z.object({
  locations: z.array(TargetingItemSchema).default([]),
  ageMin: z.number().min(13).max(65).default(18),
  ageMax: z.number().min(13).max(65).default(65),
  gender: z.enum(["all", "male", "female"]).default("all"),
  interests: z.array(TargetingItemSchema).default([]),
  locales: z.array(TargetingItemSchema).default([]),
  customAudienceIds: z.array(z.string()).default([]),
  excludedAudienceIds: z.array(z.string()).default([])
});

export const CampaignDraftPayloadSchema = z.object({
  version: z.literal(1),
  clientSlug: z.string().default(""),
  adAccountId: z.string().default(""),
  buyingType: z.literal("auction").default("auction"),
  objective: z.enum(CAMPAIGN_OBJECTIVES).default("leads"),
  visitedNodes: z.array(z.enum(["campaign", "adset", "ad", "review"])).default(["campaign"]),
  campaign: z.object({
    name: z.string().default(""),
    budgetLevel: z.enum(["campaign", "adset"]).default("adset"),
    dailyBudgetBRL: z.number().positive().default(150),
    bidStrategy: z.enum(["lowest_cost"]).default("lowest_cost"),
    specialAdCategories: z.array(z.string()).default([]),
    abTestEnabled: z.boolean().default(false)
  }),
  adset: z.object({
    name: z.string().default(""),
    conversionLocation: z.enum(["website", "instant_form", "website_and_form"]).default("website_and_form"),
    dynamicCreative: z.boolean().default(true),
    schedule: z.object({
      start: z.string().nullable().default(null),
      end: z.string().nullable().default(null)
    }),
    targeting: DraftTargetingSchema,
    placements: z.enum(["advantage_plus", "manual"]).default("advantage_plus")
  }),
  ad: z.object({
    name: z.string().default(""),
    pageId: z.string().default(""),
    instagramActorId: z.string().nullable().default(null),
    pixelId: z.string().nullable().default(null),
    format: z.enum(["single_image"]).default("single_image"),
    imageHashes: z.array(z.string()).default([]),
    titles: z.array(z.string()).default([]),
    bodies: z.array(z.string()).default([]),
    destinationType: z.enum(["website", "instant_form"]).default("website"),
    linkUrl: z.string().default(""),
    leadFormId: z.string().nullable().default(null),
    urlParams: z.string().default(""),
    tracking: z.object({
      websiteEvents: z.boolean().default(false),
      appEvents: z.boolean().default(false),
      offlineEvents: z.boolean().default(false)
    })
  }),
  meta: z
    .object({
      campaignId: z.string().optional(),
      adsetId: z.string().optional(),
      creativeId: z.string().optional(),
      adId: z.string().optional(),
      publishedAt: z.string().optional()
    })
    .optional()
});

export type CampaignDraftPayload = z.infer<typeof CampaignDraftPayloadSchema>;
export type DraftTargeting = z.infer<typeof DraftTargetingSchema>;

export function defaultCampaignDraft(locale: string): CampaignDraftPayload {
  const isEn = locale === "en";
  return CampaignDraftPayloadSchema.parse({
    version: 1,
    clientSlug: "",
    adAccountId: "",
    buyingType: "auction",
    objective: "leads",
    visitedNodes: ["campaign"],
    campaign: {
      name: isEn ? "New Leads Campaign" : "Nova campanha de Leads",
      budgetLevel: "adset",
      dailyBudgetBRL: 150,
      bidStrategy: "lowest_cost",
      specialAdCategories: [],
      abTestEnabled: false
    },
    adset: {
      name: isEn ? "New Leads Ad Set" : "Novo conjunto de anúncios de Leads",
      conversionLocation: "website_and_form",
      dynamicCreative: true,
      schedule: { start: null, end: null },
      targeting: {
        locations: [],
        ageMin: 18,
        ageMax: 65,
        gender: "all",
        interests: [],
        locales: [],
        customAudienceIds: [],
        excludedAudienceIds: []
      },
      placements: "advantage_plus"
    },
    ad: {
      name: isEn ? "New Leads Ad" : "Novo anúncio de Leads",
      pageId: "",
      instagramActorId: null,
      pixelId: null,
      format: "single_image",
      imageHashes: [],
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
      tracking: { websiteEvents: false, appEvents: false, offlineEvents: false }
    }
  });
}

export function parseCampaignDraftPayload(raw: unknown): CampaignDraftPayload {
  return CampaignDraftPayloadSchema.parse(raw);
}

export function draftTargetingToApi(t: DraftTargeting) {
  const countries = t.locations
    .filter((l) => l.meta?.type === "country")
    .map((l) => l.meta?.countryCode ?? l.value);
  const cities = t.locations
    .filter((l) => l.meta?.type === "city" || l.meta?.type === "region")
    .map((l) => ({ key: l.value }));
  const genders =
    t.gender === "male" ? [1] : t.gender === "female" ? [2] : undefined;
  const locales = t.locales.map((l) => Number(l.value)).filter((n) => !Number.isNaN(n));
  const interests = t.interests.map((i) => ({ id: i.value, name: i.label }));
  return {
    countries: countries.length ? countries : undefined,
    cities: cities.length ? cities : undefined,
    ageMin: t.ageMin,
    ageMax: t.ageMax,
    genders,
    locales: locales.length ? locales : undefined,
    interests: interests.length ? interests : undefined,
    customAudienceIds: t.customAudienceIds.length ? t.customAudienceIds : undefined,
    excludedAudienceIds: t.excludedAudienceIds.length ? t.excludedAudienceIds : undefined
  };
}

export function validateCampaignStep(d: CampaignDraftPayload): string | null {
  if (!d.clientSlug.trim()) return "clientRequired";
  if (!d.adAccountId.trim()) return "adAccountRequired";
  if (!d.campaign.name.trim()) return "campaignNameRequired";
  if (d.campaign.dailyBudgetBRL < 1) return "budgetRequired";
  return null;
}

export function validateAdSetStep(d: CampaignDraftPayload): string | null {
  if (!d.adset.name.trim()) return "adsetNameRequired";
  const t = d.adset.targeting;
  if (!t.locations.length && !t.customAudienceIds.length) return "audienceRequired";
  return null;
}

export function validateAdStep(d: CampaignDraftPayload): string | null {
  if (!d.ad.name.trim()) return "adNameRequired";
  if (!d.ad.pageId.trim()) return "pageRequired";
  if (!d.ad.imageHashes.length) return "mediaRequired";
  if (!d.ad.titles.some((x) => x.trim())) return "titlesRequired";
  if (!d.ad.bodies.some((x) => x.trim())) return "bodiesRequired";
  if (d.objective === "leads" && d.ad.destinationType === "instant_form") {
    if (!d.ad.leadFormId) return "leadFormRequired";
  } else if (!d.ad.linkUrl.trim()) {
    return "linkUrlRequired";
  }
  return null;
}

export function computeDraftScore(d: CampaignDraftPayload): number {
  let score = 0;
  const checks = [
    !validateCampaignStep(d),
    !validateAdSetStep(d),
    !validateAdStep(d),
    d.ad.imageHashes.length > 0,
    d.ad.titles.filter((x) => x.trim()).length >= 2
  ];
  score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return score;
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
