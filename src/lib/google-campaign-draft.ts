import { z } from "zod";

export const GoogleKeywordDraftSchema = z.object({
  text: z.string().max(80),
  matchType: z.enum(["EXACT", "PHRASE", "BROAD"]).default("PHRASE"),
  negative: z.boolean().default(false)
});

export const GoogleResponsiveSearchAdDraftSchema = z.object({
  id: z.string(),
  name: z.string().default("Anúncio responsivo 1"),
  finalUrl: z.string().default(""),
  path1: z.string().max(15).default(""),
  path2: z.string().max(15).default(""),
  headlines: z.array(z.string().max(30)).min(3).max(15),
  descriptions: z.array(z.string().max(90)).min(2).max(4)
});

export const GoogleAdGroupDraftSchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultCpcBRL: z.number().positive().optional(),
  keywords: z.array(GoogleKeywordDraftSchema).min(1),
  ads: z.array(GoogleResponsiveSearchAdDraftSchema).min(1)
});

export const GoogleSearchCampaignDraftSchema = z.object({
  version: z.literal(1),
  platform: z.literal("google"),
  clientSlug: z.string().default(""),
  customerId: z.string().default(""),
  managerCustomerId: z.string().optional(),
  campaign: z.object({
    name: z.string().default("Nova campanha de Pesquisa"),
    objective: z.enum(["traffic", "leads", "sales"]).default("leads"),
    dailyBudgetBRL: z.number().positive().default(50),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    bidding: z.object({
      strategy: z.enum(["maximize_clicks", "maximize_conversions", "maximize_conversion_value", "manual_cpc"]).default("maximize_clicks"),
      targetCpaBRL: z.number().positive().optional(),
      targetRoas: z.number().positive().optional(),
      maxCpcBRL: z.number().positive().optional()
    }),
    searchPartners: z.boolean().default(false),
    displayExpansion: z.boolean().default(false),
    locations: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["geo_target", "proximity"]).default("geo_target"),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      radiusKm: z.number().min(1).max(70).optional()
    })).default([{ id: "2076", name: "Brasil", type: "geo_target" }]),
    excludedLocations: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
    locationPresence: z.enum(["presence", "presence_or_interest"]).default("presence"),
    languageIds: z.array(z.string()).min(1).default(["1014"]),
    negativeKeywords: z.array(GoogleKeywordDraftSchema).default([])
  }),
  adGroups: z.array(GoogleAdGroupDraftSchema).min(1),
  meta: z.object({
    creationMode: z.enum(["manual", "ai"]).optional(),
    validatedAt: z.string().optional(),
    publishedAt: z.string().optional(),
    googleCampaignId: z.string().optional(),
    aiProvider: z.enum(["gemini", "claude"]).optional()
  }).optional()
});

export type GoogleSearchCampaignDraft = z.infer<typeof GoogleSearchCampaignDraftSchema>;
export type GoogleKeywordDraft = z.infer<typeof GoogleKeywordDraftSchema>;

/** Aceita uma keyword por linha, incluindo a notação comum do Google: [exata] e "frase". */
export function parseGoogleKeywordList(raw: string, negative = false): GoogleKeywordDraft[] {
  const seen = new Set<string>();
  const result: GoogleKeywordDraft[] = [];
  for (const source of raw.split(/\r?\n|,/)) {
    let text = source.trim();
    if (!text) continue;
    let matchType: GoogleKeywordDraft["matchType"] = "BROAD";
    if (text.startsWith("[") && text.endsWith("]")) {
      matchType = "EXACT";
      text = text.slice(1, -1).trim();
    } else if (text.startsWith('"') && text.endsWith('"')) {
      matchType = "PHRASE";
      text = text.slice(1, -1).trim();
    }
    if (!text || text.length > 80) continue;
    const key = `${text.toLocaleLowerCase("pt-BR")}:${matchType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ text, matchType, negative });
  }
  return result;
}

let sequence = 0;
export function newGoogleDraftId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

export function defaultGoogleCampaignDraft(clientSlug = ""): GoogleSearchCampaignDraft {
  return {
    version: 1,
    platform: "google",
    clientSlug,
    customerId: "",
    campaign: {
      name: "Nova campanha de Pesquisa",
      objective: "leads",
      dailyBudgetBRL: 50,
      bidding: { strategy: "maximize_clicks" },
      searchPartners: false,
      displayExpansion: false,
      locations: [{ id: "2076", name: "Brasil", type: "geo_target" }],
      excludedLocations: [],
      locationPresence: "presence",
      languageIds: ["1014"],
      negativeKeywords: []
    },
    adGroups: [{
      id: newGoogleDraftId("group"),
      name: "Grupo de anúncios 1",
      keywords: [{ text: "", matchType: "PHRASE", negative: false }],
      ads: [{
        id: newGoogleDraftId("ad"),
        name: "Anúncio responsivo 1",
        finalUrl: "",
        path1: "",
        path2: "",
        headlines: ["", "", ""],
        descriptions: ["", ""]
      }]
    }],
    meta: { creationMode: "manual" }
  };
}

export function validateGoogleCampaignDraft(draft: GoogleSearchCampaignDraft): string[] {
  const issues: string[] = [];
  if (!draft.clientSlug) issues.push("Selecione um cliente.");
  if (!draft.customerId) issues.push("O cliente precisa ter uma conta Google Ads vinculada.");
  if (!draft.campaign.name.trim()) issues.push("Informe o nome da campanha.");
  if (!draft.campaign.locations.length) issues.push("Adicione ao menos uma localização.");
  if (draft.campaign.locations.some((location) => location.type !== "proximity" && !/^\d+$/.test(location.id))) issues.push("A localização digitada ainda precisa ser confirmada no catálogo geográfico do Google.");
  if (draft.campaign.locations.some((location) => location.type === "proximity" && (location.latitude == null || location.longitude == null || location.radiusKm == null))) issues.push("Há uma área no mapa sem coordenadas ou raio válidos.");
  for (const [groupIndex, group] of draft.adGroups.entries()) {
    if (!group.name.trim()) issues.push(`Informe o nome do grupo ${groupIndex + 1}.`);
    if (!group.keywords.some((keyword) => keyword.text.trim())) issues.push(`Adicione palavras-chave ao grupo ${groupIndex + 1}.`);
    for (const ad of group.ads) {
      if (!/^https:\/\//i.test(ad.finalUrl)) issues.push(`Informe uma URL HTTPS válida em ${ad.name}.`);
      if (ad.headlines.filter((value) => value.trim()).length < 3) issues.push(`${ad.name} precisa de pelo menos 3 títulos.`);
      if (ad.descriptions.filter((value) => value.trim()).length < 2) issues.push(`${ad.name} precisa de pelo menos 2 descrições.`);
    }
  }
  return issues;
}
