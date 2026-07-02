import "server-only";

import { z } from "zod";

import {
  TRAFFIC_AI_AUDIENCE_PREFIX,
  META_SEGMENT_LIMITS,
  countSegmentsByType,
  type AudiencePersonaPreview,
  type AudienceTargetingSuggestion,
  type AudienceTargetingSuggestionItem
} from "@/lib/audience-targeting-shared";
import { llmGenerateJson } from "@/lib/llm/generate-json";
import {
  normalizeAudiencePickRaw,
  normalizePersonaRaw,
  normalizeSearchPlanRaw,
  normalizeStringArray
} from "@/lib/llm/normalize-llm-json";
import type { LlmProviderId } from "@/lib/llm/types";
import {
  searchAdInterests,
  searchAdTargetingCategories,
  validateTargetingIdList
} from "@/lib/meta-graph";
import { isMetaGraphApiError } from "@/lib/audience-api-helpers";
import { resolveFlexBucket, type MetaFlexSpecBucket } from "@/lib/meta-targeting-flex";
import { finalizeFlexibleSpecTargeting } from "@/lib/meta-targeting-prune";
import {
  buildReplacementCatalogFromRejected,
  formatReplacementHintsForPrompt,
  type ReplacementCatalogItem
} from "@/lib/meta-segment-replacement";
import { sanitizeTargetingForMeta } from "@/lib/meta-targeting-sanitize";

export {
  TRAFFIC_AI_AUDIENCE_PREFIX,
  applySuggestionToDraftTargeting,
  type AudienceTargetingSuggestion,
  type AudienceTargetingSuggestionItem
} from "@/lib/audience-targeting-shared";

export const AudienceTargetingBriefSchema = z.object({
  businessDescription: z.string().min(3).max(500),
  targetProfile: z.string().min(3).max(500),
  behaviors: z.string().max(500).optional(),
  lifestyleHints: z.string().max(500).optional(),
  exclusionHints: z.string().max(500).optional(),
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  countries: z.array(z.string()).default(["BR"]),
  includeCustomAudienceIds: z.array(z.string()).default([]),
  excludeCustomAudienceIds: z.array(z.string()).default([]),
  rejectedSegmentIds: z.array(z.string()).default([]),
  rejectedSegments: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(["interest", "behavior", "demographic"])
      })
    )
    .default([]),
  avoidSegmentIds: z.array(z.string()).default([])
});

export type AudienceTargetingBrief = z.infer<typeof AudienceTargetingBriefSchema>;

const PersonaCoreSchema = z.object({
  personaName: z.string().min(1),
  narrative: z.string().min(1),
  traits: z.array(z.string()).min(1).max(8),
  lifestyleCorrelates: z.array(z.string()).max(12).default([]),
  searchPlan: z.preprocess(
    normalizeSearchPlanRaw,
    z.object({
      interestQueries: z.array(z.string()).max(12).default([]),
      behaviorQueries: z.array(z.string()).max(12).default([]),
      demographicQueries: z.array(z.string()).max(8).default([]),
      lifeEventQueries: z.array(z.string()).max(8).default([])
    })
  ),
  suggestedGender: z.enum(["all", "male", "female"]).optional()
});

export const AudiencePersonaPreviewSchema = z.preprocess(normalizePersonaRaw, PersonaCoreSchema);

export type AudiencePersonaCore = z.infer<typeof PersonaCoreSchema>;

export const AudiencePersonaPreviewPayloadSchema = PersonaCoreSchema.extend({
  provider: z.enum(["gemini", "claude"]).optional(),
  modelUsed: z.string().optional()
});

const PickSchema = z.preprocess(
  normalizeAudiencePickRaw,
  z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    name: z.string().min(1),
    genders: z.array(z.union([z.literal(1), z.literal(2)])).optional(),
    interestIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(20)).default([]),
    behaviorIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(16)).default([]),
    demographicIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(10)).default([]),
    reasoning: z.string().optional()
  })
);

type SearchPlan = z.infer<typeof PersonaCoreSchema>["searchPlan"];

type CatalogItem = {
  type: "interest" | "behavior" | "demographic";
  id: string;
  name: string;
  audienceSize?: number;
  path?: string[];
  flexBucket?: MetaFlexSpecBucket;
};

function dedupeCatalog(items: CatalogItem[]): CatalogItem[] {
  const map = new Map<string, CatalogItem>();
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

function dedupeQueries(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const q = raw.trim();
    if (q.length < 2) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    if (out.length >= max) break;
  }
  return out;
}

/** Extrai termos pesquisáveis do briefing (marcas, apps, hobbies) para ampliar o catálogo Meta. */
function expandSearchPlan(plan: SearchPlan, persona: AudiencePersonaCore): SearchPlan {
  const extraInterests: string[] = [];
  const extraBehaviors: string[] = [];
  const extraLifeEvents: string[] = [];

  const tokenize = (text: string) =>
    text
      .split(/[,;·•|/]+|\s+-\s+/)
      .map((part) => part.replace(/^[\s\d.)]+/, "").trim())
      .filter((part) => part.length >= 3 && part.length <= 48);

  for (const line of [...persona.lifestyleCorrelates, ...persona.traits]) {
    for (const token of tokenize(line)) {
      if (/^(mulher|homem|idade|classe|premium|luxo)$/i.test(token)) continue;
      extraInterests.push(token);
    }
  }

  for (const q of plan.interestQueries) {
    for (const token of tokenize(q)) extraInterests.push(token);
  }
  for (const q of plan.behaviorQueries) {
    for (const token of tokenize(q)) extraBehaviors.push(token);
  }
  for (const q of plan.lifeEventQueries ?? []) {
    for (const token of tokenize(q)) extraLifeEvents.push(token);
  }

  return {
    interestQueries: dedupeQueries([...plan.interestQueries, ...extraInterests], 18),
    behaviorQueries: dedupeQueries([...plan.behaviorQueries, ...extraBehaviors], 16),
    lifeEventQueries: dedupeQueries([...(plan.lifeEventQueries ?? []), ...extraLifeEvents], 10),
    demographicQueries: dedupeQueries(plan.demographicQueries, 10)
  };
}

const GENERIC_BEHAVIOR_PATTERNS = [
  /acesso ao facebook/i,
  /mac os/i,
  /windows/i,
  /android/i,
  /iphone/i,
  /early adopters?/i,
  /primeiros adeptos/i
];

function isGenericLowValueSegment(item: CatalogItem): boolean {
  if (item.type !== "behavior") return false;
  const haystack = `${item.name} ${(item.path ?? []).join(" ")}`;
  return GENERIC_BEHAVIOR_PATTERNS.some((re) => re.test(haystack));
}

async function buildCatalog(accessToken: string, plan: SearchPlan): Promise<CatalogItem[]> {
  const rows: CatalogItem[] = [];

  await Promise.all([
    ...plan.interestQueries.map(async (q) => {
      const hits = await searchAdInterests(accessToken, q);
      for (const h of hits.slice(0, 15)) {
        rows.push({
          type: "interest",
          id: h.id,
          name: h.name,
          audienceSize: h.audienceSize,
          path: h.path,
          flexBucket: "interests"
        });
      }
    }),
    ...plan.behaviorQueries.map(async (q) => {
      const hits = await searchAdTargetingCategories(accessToken, q, "behaviors");
      for (const h of hits.slice(0, 12)) {
        rows.push({
          type: "behavior",
          id: h.id,
          name: h.name,
          audienceSize: h.audience_size,
          path: h.path,
          flexBucket: resolveFlexBucket({ path: h.path, itemType: "behavior" })
        });
      }
    }),
    ...(plan.lifeEventQueries ?? []).map(async (q) => {
      const hits = await searchAdTargetingCategories(accessToken, q, "life_events");
      for (const h of hits.slice(0, 10)) {
        rows.push({
          type: "behavior",
          id: h.id,
          name: h.name,
          audienceSize: h.audience_size,
          path: h.path,
          flexBucket: resolveFlexBucket({ path: h.path, itemType: "behavior" })
        });
      }
    }),
    ...plan.demographicQueries.map(async (q) => {
      const hits = await searchAdTargetingCategories(accessToken, q, "demographics");
      for (const h of hits.slice(0, 10)) {
        rows.push({
          type: "demographic",
          id: h.id,
          name: h.name,
          audienceSize: h.audience_size,
          path: h.path,
          flexBucket: resolveFlexBucket({ path: h.path, itemType: "demographic" })
        });
      }
    })
  ]);

  return dedupeCatalog(rows).filter((item) => !isGenericLowValueSegment(item));
}

const FallbackQueriesSchema = z.preprocess(
  normalizeSearchPlanRaw,
  z.object({
    interestQueries: z.array(z.string()).max(10).default([]),
    behaviorQueries: z.array(z.string()).max(8).default([]),
    lifeEventQueries: z.array(z.string()).max(6).default([]),
    demographicQueries: z.array(z.string()).max(6).default([])
  })
);

const RankedIdsSchema = z.object({
  rankedIds: z.array(z.string()).max(80).default([])
});

async function generateFallbackSearchQueries(args: {
  provider: LlmProviderId;
  persona: AudiencePersonaCore;
  brief: AudienceTargetingBrief;
}): Promise<SearchPlan> {
  const prompt = [
    "A busca na Meta retornou poucos segmentos para esta persona.",
    "Gere termos de busca ALTERNATIVOS e GRANULARES (marcas, produtos, apps, hobbies) que a API de targeting da Meta costuma indexar.",
    "Use português e nomes internacionais. Evite termos genéricos como 'luxo' sozinho — prefira marcas e categorias concretas.",
    "",
    "Responda APENAS JSON: { interestQueries, behaviorQueries, lifeEventQueries, demographicQueries }",
    "",
    "Persona:",
    JSON.stringify({
      personaName: args.persona.personaName,
      narrative: args.persona.narrative,
      traits: args.persona.traits,
      lifestyleCorrelates: args.persona.lifestyleCorrelates,
      searchPlan: args.persona.searchPlan
    }),
    "",
    "Briefing:",
    JSON.stringify({
      businessDescription: args.brief.businessDescription,
      targetProfile: args.brief.targetProfile,
      behaviors: args.brief.behaviors,
      lifestyleHints: args.brief.lifestyleHints
    })
  ].join("\n");

  const result = await llmGenerateJson({
    provider: args.provider,
    prompt,
    schema: FallbackQueriesSchema,
    temperature: 0.3
  });
  return result.data;
}

async function rankCatalogForPersona(args: {
  provider: LlmProviderId;
  persona: AudiencePersonaCore;
  brief: AudienceTargetingBrief;
  catalog: CatalogItem[];
  maxItems?: number;
}): Promise<CatalogItem[]> {
  const maxItems = args.maxItems ?? 70;
  if (args.catalog.length <= maxItems) return args.catalog;

  const prompt = [
    "Você recebeu uma PERSONA validada e um CATÁLOGO de segmentos reais da Meta.",
    "Ordene os IDs do catálogo do MAIS ao MENOS relevante para esta persona e briefing.",
    "Priorize interesses de marcas/produtos, comportamentos de compra/viagem e demografia alinhada.",
    "Evite segmentos genéricos de plataforma (SO, early adopters) quando houver opções melhores.",
    `Retorne até ${maxItems} IDs em rankedIds.`,
    "",
    "Responda APENAS JSON: { rankedIds: string[] }",
    "",
    "Persona:",
    JSON.stringify({
      personaName: args.persona.personaName,
      narrative: args.persona.narrative,
      traits: args.persona.traits,
      lifestyleCorrelates: args.persona.lifestyleCorrelates,
      searchPlan: args.persona.searchPlan
    }),
    "",
    "Briefing:",
    JSON.stringify({
      targetProfile: args.brief.targetProfile,
      behaviors: args.brief.behaviors,
      lifestyleHints: args.brief.lifestyleHints,
      exclusionHints: args.brief.exclusionHints
    }),
    "",
    "Catálogo:",
    formatCatalogForPrompt(args.catalog)
  ].join("\n");

  const result = await llmGenerateJson({
    provider: args.provider,
    prompt,
    schema: RankedIdsSchema,
    temperature: 0.15
  });

  const byId = new Map(args.catalog.map((c) => [c.id, c]));
  const ranked: CatalogItem[] = [];
  for (const id of result.data.rankedIds) {
    const row = byId.get(id);
    if (row) ranked.push(row);
    if (ranked.length >= maxItems) break;
  }
  for (const item of args.catalog) {
    if (ranked.length >= maxItems) break;
    if (!ranked.some((r) => r.id === item.id)) ranked.push(item);
  }
  return ranked;
}

function parseExclusionTokens(exclusionHints?: string): string[] {
  if (!exclusionHints?.trim()) return [];
  return exclusionHints
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function filterCatalogByExclusions(catalog: CatalogItem[], exclusionHints?: string): CatalogItem[] {
  const tokens = parseExclusionTokens(exclusionHints);
  if (!tokens.length) return catalog;
  return catalog.filter((item) => {
    const haystack = `${item.name} ${(item.path ?? []).join(" ")}`.toLowerCase();
    return !tokens.some((token) => haystack.includes(token));
  });
}

async function enrichCatalogWithValidation(
  accessToken: string,
  adAccountId: string,
  catalog: CatalogItem[]
): Promise<CatalogItem[]> {
  if (!catalog.length) return catalog;

  try {
    const validated = await validateTargetingIdList(
      accessToken,
      adAccountId,
      catalog.map((c) => c.id)
    );
    const invalidIds = new Set(
      validated.filter((row) => row.valid === false).map((row) => row.id)
    );
    const typeById = new Map(validated.map((v) => [v.id, v.type]));

    return catalog
      .filter((item) => !invalidIds.has(item.id))
      .map((item) => ({
        ...item,
        flexBucket: resolveFlexBucket({
          path: item.path,
          itemType: item.type,
          validatedType: typeById.get(item.id)
        })
      }));
  } catch (e) {
    if (!isMetaGraphApiError(e)) throw e;
    return catalog;
  }
}

function formatCatalogForPrompt(catalog: CatalogItem[]): string {
  return JSON.stringify(
    catalog.map((c) => ({
      type: c.type,
      id: c.id,
      name: c.name,
      audienceSize: c.audienceSize ?? null
    }))
  );
}

function buildFlexibleSpec(pick: z.infer<typeof PickSchema>, catalog: Map<string, CatalogItem>) {
  const spec: Record<string, Array<{ id: string; name: string }>> = {};

  const add = (id: string, row: CatalogItem) => {
    const bucket =
      row.flexBucket ??
      resolveFlexBucket({ path: row.path, itemType: row.type, validatedType: undefined });
    if (!spec[bucket]) spec[bucket] = [];
    if (!spec[bucket]!.some((x) => x.id === id)) {
      spec[bucket]!.push({ id, name: row.name });
    }
  };

  for (const id of pick.interestIds) {
    const row = catalog.get(id);
    if (!row || row.type !== "interest") continue;
    add(id, row);
  }
  for (const id of pick.behaviorIds) {
    const row = catalog.get(id);
    if (!row || row.type !== "behavior") continue;
    add(id, row);
  }
  for (const id of pick.demographicIds) {
    const row = catalog.get(id);
    if (!row || row.type !== "demographic") continue;
    add(id, row);
  }

  return Object.keys(spec).length ? [spec] : [];
}

export function buildMetaTargetingFromSuggestion(args: {
  pick: z.infer<typeof PickSchema>;
  catalog: CatalogItem[];
  brief: AudienceTargetingBrief;
}): Record<string, unknown> {
  const catalogMap = new Map(args.catalog.map((c) => [c.id, c]));
  const flexible = buildFlexibleSpec(args.pick, catalogMap);

  const targeting: Record<string, unknown> = {
    geo_locations: { countries: args.brief.countries.length ? args.brief.countries : ["BR"] },
    age_min: args.brief.ageMin ?? 18,
    age_max: args.brief.ageMax ?? 65
  };

  if (args.pick.genders?.length) targeting.genders = args.pick.genders;
  else if (args.brief.gender === "male") targeting.genders = [1];
  else if (args.brief.gender === "female") targeting.genders = [2];

  if (flexible.length) targeting.flexible_spec = flexible;

  if (args.brief.includeCustomAudienceIds.length) {
    targeting.custom_audiences = args.brief.includeCustomAudienceIds.map((id) => ({ id }));
  }
  if (args.brief.excludeCustomAudienceIds.length) {
    targeting.excluded_custom_audiences = args.brief.excludeCustomAudienceIds.map((id) => ({
      id
    }));
  }

  return sanitizeTargetingForMeta(targeting);
}

export function ensureTrafficAiAudienceName(name: string, clientName?: string): string {
  const trimmed = name.trim();
  if (trimmed.startsWith(TRAFFIC_AI_AUDIENCE_PREFIX)) return trimmed;
  const base = clientName ? `${clientName} — ${trimmed}` : trimmed;
  return `${TRAFFIC_AI_AUDIENCE_PREFIX} ${base}`.slice(0, 200);
}

export function suggestionItemsFromPick(
  pick: z.infer<typeof PickSchema>,
  catalog: CatalogItem[]
): AudienceTargetingSuggestionItem[] {
  const map = new Map(catalog.map((c) => [c.id, c]));
  const items: AudienceTargetingSuggestionItem[] = [];

  for (const id of pick.interestIds) {
    const row = map.get(id);
    if (row) items.push({ type: "interest", id, name: row.name });
  }
  for (const id of pick.behaviorIds) {
    const row = map.get(id);
    if (row) items.push({ type: "behavior", id, name: row.name });
  }
  for (const id of pick.demographicIds) {
    const row = map.get(id);
    if (row) items.push({ type: "demographic", id, name: row.name });
  }

  return items;
}

function buildPersonaPrompt(brief: AudienceTargetingBrief): string {
  return buildPersonaOnlyPrompt({
    businessDescription: brief.businessDescription,
    targetProfile: brief.targetProfile,
    behaviors: brief.behaviors,
    lifestyleHints: brief.lifestyleHints,
    exclusionHints: brief.exclusionHints
  });
}

/** Prompt isolado para Módulo A (Personas) — sem geo, países ou coordenadas. */
export function buildPersonaOnlyPrompt(input: {
  businessDescription?: string;
  targetProfile: string;
  behaviors?: string;
  lifestyleHints?: string;
  exclusionHints?: string;
  freeformPrompt?: string;
}): string {
  return [
    "Você é especialista em segmentação Meta Ads no Brasil.",
    "MÓDULO PERSONA — retorne APENAS características demográficas e de interesse.",
    "PROIBIDO: países, cidades, bairros, CEPs, coordenadas, geo_locations ou qualquer dado geográfico.",
    "Sua tarefa NÃO é escolher um público pronto nem inventar IDs da Meta.",
    "Construa uma PERSONA (perfil ideal) e derive termos de busca para interesses/comportamentos/demografia Meta.",
    "",
    "REGRAS PARA searchPlan (muito importante):",
    "- Use termos GRANULARES e específicos — nomes de marcas, produtos, hobbies e comportamentos concretos.",
    "- Se o perfil menciona uma categoria ampla (ex: marcas de luxo, viagens, fitness), liste exemplos reais: Prada, Chanel, Gucci, Balenciaga; Booking.com; corrida, yoga, academia.",
    "- Evite 1 termo genérico largo; prefira 8–12 queries específicas que a Meta possa indexar.",
    "- Inclua variações em português e nomes internacionais quando fizer sentido.",
    "- Separe bem: interestQueries (interesses), behaviorQueries (comportamentos de compra/uso na Meta), lifeEventQueries (eventos de vida relevantes), demographicQueries (demografia).",
    "- behaviorQueries e lifeEventQueries são OBRIGATÓRIOS quando o perfil descreve hábitos, compras, viagens, uso de apps ou estilo de vida — busque congruência com o formulário.",
    "- Gere pelo menos 4 behaviorQueries e 2 lifeEventQueries quando houver pistas de comportamento ou estilo de vida.",
    input.exclusionHints?.trim()
      ? `- NÃO inclua nos searchPlan termos relacionados a exclusões do usuário: ${input.exclusionHints.trim()}`
      : "",
    "",
    "Responda APENAS JSON:",
    "{",
    '  "personaName": string,',
    '  "narrative": string,',
    '  "traits": string[],',
    '  "lifestyleCorrelates": string[],',
    '  "searchPlan": {',
    '    "interestQueries": string[] (máx. 12),',
    '    "behaviorQueries": string[] (máx. 12),',
    '    "lifeEventQueries": string[] (máx. 8),',
    '    "demographicQueries": string[] (máx. 8)',
    "  },",
    '  "suggestedGender"?: "all" | "male" | "female"',
    "}",
    "",
    "Entrada:",
    JSON.stringify(input)
  ]
    .filter(Boolean)
    .join("\n");
}

/** Targeting Meta sem geo — para persistência em user_personas. */
export function buildPersonaTargetingFromSuggestion(args: {
  pick: z.infer<typeof PickSchema>;
  catalog: CatalogItem[];
  brief: Pick<AudienceTargetingBrief, "ageMin" | "ageMax" | "gender">;
}): Record<string, unknown> {
  const catalogMap = new Map(args.catalog.map((c) => [c.id, c]));
  const flexible = buildFlexibleSpec(args.pick, catalogMap);

  const targeting: Record<string, unknown> = {
    age_min: args.brief.ageMin ?? 18,
    age_max: args.brief.ageMax ?? 65
  };

  if (args.pick.genders?.length) targeting.genders = args.pick.genders;
  else if (args.brief.gender === "male") targeting.genders = [1];
  else if (args.brief.gender === "female") targeting.genders = [2];

  if (flexible.length) targeting.flexible_spec = flexible;

  return sanitizeTargetingForMeta(targeting);
}

export async function generateAudiencePersonaPreview(args: {
  provider: LlmProviderId;
  brief: AudienceTargetingBrief;
}): Promise<AudiencePersonaPreview> {
  const brief = AudienceTargetingBriefSchema.parse(args.brief);
  const result = await llmGenerateJson({
    provider: args.provider,
    prompt: buildPersonaPrompt(brief),
    schema: AudiencePersonaPreviewSchema,
    temperature: 0.4
  });

  const persona = result.data;
  const hasQueries =
    persona.searchPlan.interestQueries.length > 0 ||
    persona.searchPlan.behaviorQueries.length > 0 ||
    persona.searchPlan.demographicQueries.length > 0 ||
    (persona.searchPlan.lifeEventQueries?.length ?? 0) > 0;

  if (!hasQueries) {
    throw new Error(
      "A prévia não gerou termos de busca para a Meta. Tente descrever o perfil com mais detalhes."
    );
  }

  return {
    ...persona,
    provider: args.provider,
    modelUsed: result.modelUsed
  };
}

export async function generateAudienceTargetingSuggestion(args: {
  accessToken: string;
  adAccountId: string;
  provider: LlmProviderId;
  brief: AudienceTargetingBrief;
  persona: AudiencePersonaPreview;
  clientName?: string;
  customAudiences?: Array<{ id: string; name?: string; subtype?: string }>;
}): Promise<AudienceTargetingSuggestion> {
  const brief = AudienceTargetingBriefSchema.parse(args.brief);
  const persona = AudiencePersonaPreviewPayloadSchema.parse(args.persona);

  const rejectedIds = new Set([
    ...brief.rejectedSegmentIds,
    ...brief.rejectedSegments.map((s) => s.id)
  ]);

  const expandedPlan = expandSearchPlan(persona.searchPlan, persona);
  let planCatalog = await buildCatalog(args.accessToken, expandedPlan);

  if (planCatalog.length < 18) {
    const fallbackPlan = await generateFallbackSearchQueries({
      provider: args.provider,
      persona,
      brief
    });
    const fallbackCatalog = await buildCatalog(args.accessToken, {
      interestQueries: dedupeQueries(
        [...expandedPlan.interestQueries, ...fallbackPlan.interestQueries],
        20
      ),
      behaviorQueries: dedupeQueries(
        [...expandedPlan.behaviorQueries, ...fallbackPlan.behaviorQueries],
        18
      ),
      lifeEventQueries: dedupeQueries(
        [...(expandedPlan.lifeEventQueries ?? []), ...(fallbackPlan.lifeEventQueries ?? [])],
        12
      ),
      demographicQueries: dedupeQueries(
        [...expandedPlan.demographicQueries, ...fallbackPlan.demographicQueries],
        12
      )
    });
    planCatalog = dedupeCatalog([...planCatalog, ...fallbackCatalog]);
  }

  const { catalog: replacementCatalog, hints: replacementHints } =
    brief.rejectedSegments.length > 0
      ? await buildReplacementCatalogFromRejected(
          args.accessToken,
          args.adAccountId,
          brief.rejectedSegments
        )
      : { catalog: [] as ReplacementCatalogItem[], hints: [] };

  const rawCatalog = filterCatalogByExclusions(
    dedupeCatalog([
      ...planCatalog.filter((item) => !rejectedIds.has(item.id)),
      ...replacementCatalog.map((item) => ({
        type: item.type,
        id: item.id,
        name: item.name,
        audienceSize: item.audienceSize,
        path: item.path,
        flexBucket: item.flexBucket
      }))
    ]),
    brief.exclusionHints
  );
  if (!rawCatalog.length) {
    throw new Error(
      "Nenhum interesse ou comportamento encontrado na Meta para esta persona. Ajuste a prévia ou tente outros termos."
    );
  }

  const catalog = await enrichCatalogWithValidation(
    args.accessToken,
    args.adAccountId,
    rawCatalog
  );

  const rankedCatalog = await rankCatalogForPersona({
    provider: args.provider,
    persona,
    brief,
    catalog
  });

  const interestCount = rankedCatalog.filter((c) => c.type === "interest").length;
  const behaviorCount = rankedCatalog.filter((c) => c.type === "behavior").length;
  const demographicCount = rankedCatalog.filter((c) => c.type === "demographic").length;

  const pickPrompt = [
    "Você recebeu uma PERSONA já validada pelo usuário e um CATÁLOGO real da Meta (IDs verificados).",
    "Sua tarefa é escolher os segmentos do catálogo MAIS SEMELHANTES ao briefing e aos termos planejados — como um especialista em targeting Meta.",
    "NÃO invente público nem IDs. Selecione somente segmentos do catálogo que combinem com a persona.",
    `Nome do público salvo deve começar com "${TRAFFIC_AI_AUDIENCE_PREFIX}" e ser descritivo.`,
    brief.includeCustomAudienceIds.length
      ? `Inclua estes custom audiences no targeting final (já reservados): ${brief.includeCustomAudienceIds.join(", ")}`
      : "",
    brief.excludeCustomAudienceIds.length
      ? `Exclua estes custom audiences: ${brief.excludeCustomAudienceIds.join(", ")}`
      : "",
    brief.exclusionHints?.trim()
      ? `EXCLUSÕES OBRIGATÓRIAS — não selecione segmentos que conflitem com: ${brief.exclusionHints.trim()}. Prefira segmentos congruentes com o perfil-alvo.`
      : "",
    rejectedIds.size
      ? `NÃO use estes IDs descontinuados pela Meta: ${[...rejectedIds].join(", ")}.`
      : "",
    brief.avoidSegmentIds.length
      ? `Busca alternativa: NÃO repita estes IDs da tentativa anterior — escolha outros segmentos igualmente relevantes do catálogo: ${brief.avoidSegmentIds.join(", ")}.`
      : "",
    replacementHints.length ? formatReplacementHintsForPrompt(replacementHints) : "",
    args.customAudiences?.length
      ? `Custom audiences disponíveis: ${JSON.stringify(args.customAudiences.slice(0, 20))}`
      : "",
    "",
    "Responda APENAS JSON:",
    "{ title, summary, name, genders?: [1|2], interestIds: string[], behaviorIds: string[], demographicIds: string[], reasoning? }",
    "Selecione o máximo de segmentos RELEVANTES do catálogo (até 20 interesses, 16 comportamentos, 10 demográficos).",
    interestCount >= 6
      ? `Selecione pelo menos ${Math.min(8, interestCount)} interestIds entre os mais alinhados ao briefing.`
      : interestCount > 0
        ? `Selecione todos os interestIds relevantes disponíveis (${interestCount} no catálogo).`
        : "",
    behaviorCount >= 4
      ? `Selecione pelo menos ${Math.min(6, behaviorCount)} behaviorIds — priorize compra, viagem, e-commerce e estilo de vida descritos no briefing.`
      : behaviorCount > 0
        ? `Selecione todos os behaviorIds relevantes disponíveis (${behaviorCount} no catálogo).`
        : "",
    demographicCount >= 2
      ? `Inclua demographicIds quando fizer sentido (até ${Math.min(4, demographicCount)}).`
      : "",
    "EVITE segmentos genéricos de plataforma (SO do dispositivo, early adopters genérico) se houver opções mais específicas no catálogo.",
    "Compare cada candidato com searchPlan e lifestyleCorrelates — prefira marcas, produtos e comportamentos concretos citados no briefing.",
    "Priorize comportamentos (behaviorIds) quando o perfil descreve hábitos de compra, viagem, uso digital ou estilo de vida.",
    "Não inclua age_min nem age_max — a idade vem do formulário do usuário.",
    "",
    "Termos planejados para busca (referência de congruência):",
    JSON.stringify(persona.searchPlan),
    "",
    "Persona:",
    JSON.stringify({
      personaName: persona.personaName,
      narrative: persona.narrative,
      traits: persona.traits,
      lifestyleCorrelates: persona.lifestyleCorrelates,
      suggestedGender: persona.suggestedGender ?? brief.gender
    }),
    "",
    "Idade definida pelo usuário (não altere):",
    JSON.stringify({ ageMin: brief.ageMin ?? 18, ageMax: brief.ageMax ?? 65 }),
    "",
    "Catálogo (use somente estes IDs, já ordenados por relevância):",
    formatCatalogForPrompt(rankedCatalog)
  ]
    .filter(Boolean)
    .join("\n");

  const pickResult = await llmGenerateJson({
    provider: args.provider,
    prompt: pickPrompt,
    schema: PickSchema,
    temperature: brief.avoidSegmentIds.length ? 0.35 : 0.15
  });

  const catalogIds = new Set(rankedCatalog.map((c) => c.id));
  const pick = {
    ...pickResult.data,
    interestIds: pickResult.data.interestIds.filter((id) => catalogIds.has(id)),
    behaviorIds: pickResult.data.behaviorIds.filter((id) => catalogIds.has(id)),
    demographicIds: pickResult.data.demographicIds.filter((id) => catalogIds.has(id))
  };

  if (!pick.interestIds.length && !pick.behaviorIds.length && !pick.demographicIds.length) {
    throw new Error(
      "A IA não selecionou segmentos válidos da Meta. Tente novamente ou use o Gemini."
    );
  }

  const targeting = buildMetaTargetingFromSuggestion({
    pick,
    catalog: rankedCatalog,
    brief: {
      ...brief,
      gender: persona.suggestedGender ?? brief.gender
    }
  });

  const { targeting: validatedTargeting, removed } = await finalizeFlexibleSpecTargeting(
    targeting,
    args.accessToken,
    args.adAccountId
  );
  const removedIds = new Set(removed.map((row) => row.id));
  const items = suggestionItemsFromPick(pick, rankedCatalog).filter((item) => !removedIds.has(item.id));

  return {
    title: pick.title,
    summary: `${persona.personaName}: ${pick.summary}`,
    name: ensureTrafficAiAudienceName(pick.name, args.clientName),
    targeting: validatedTargeting,
    items,
    removedSegments: removed.length ? removed : undefined,
    replacementHints: replacementHints.length
      ? replacementHints.map((h) => ({
          rejected: h.rejected,
          alternatives: h.alternatives
        }))
      : undefined,
    includeCustomAudienceIds: brief.includeCustomAudienceIds,
    excludeCustomAudienceIds: brief.excludeCustomAudienceIds,
    provider: args.provider,
    modelUsed: pickResult.modelUsed
  };
}

const IncrementalPickSchema = z.object({
  interestIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(20)).default([]),
  behaviorIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(16)).default([]),
  demographicIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(10)).default([])
});

function keepItemsToCatalog(keepItems: AudienceTargetingSuggestionItem[]): CatalogItem[] {
  return keepItems.map((item) => ({
    type: item.type,
    id: item.id,
    name: item.name
  }));
}

function mergeIncrementalPick(
  keepItems: AudienceTargetingSuggestionItem[],
  newPick: z.infer<typeof IncrementalPickSchema>
): z.infer<typeof PickSchema> {
  const keepIds = new Set(keepItems.map((i) => i.id));
  const mergeType = (type: "interest" | "behavior" | "demographic", newIds: string[]) => {
    const existing = keepItems.filter((i) => i.type === type).map((i) => i.id);
    const added = newIds.filter((id) => !keepIds.has(id));
    return [...existing, ...added].slice(0, META_SEGMENT_LIMITS[type]);
  };

  return {
    title: "",
    summary: "",
    name: "",
    interestIds: mergeType("interest", newPick.interestIds),
    behaviorIds: mergeType("behavior", newPick.behaviorIds),
    demographicIds: mergeType("demographic", newPick.demographicIds)
  };
}

export async function generateAdditionalAudienceSegments(args: {
  accessToken: string;
  adAccountId: string;
  provider: LlmProviderId;
  brief: AudienceTargetingBrief;
  persona: AudiencePersonaPreview;
  keepItems: AudienceTargetingSuggestionItem[];
  addPrompt: string;
  existingMeta: {
    title: string;
    summary: string;
    name: string;
    includeCustomAudienceIds: string[];
    excludeCustomAudienceIds: string[];
    provider: LlmProviderId;
    modelUsed: string;
  };
  clientName?: string;
  personaOnly?: boolean;
}): Promise<AudienceTargetingSuggestion> {
  const brief = AudienceTargetingBriefSchema.parse(args.brief);
  const persona = AudiencePersonaPreviewPayloadSchema.parse(args.persona);
  const keepItems = args.keepItems;
  const keepIds = new Set(keepItems.map((i) => i.id));
  const counts = countSegmentsByType(keepItems);
  const remaining = {
    interest: META_SEGMENT_LIMITS.interest - counts.interest,
    behavior: META_SEGMENT_LIMITS.behavior - counts.behavior,
    demographic: META_SEGMENT_LIMITS.demographic - counts.demographic
  };

  if (remaining.interest <= 0 && remaining.behavior <= 0 && remaining.demographic <= 0) {
    throw new Error("Todos os limites de segmentos já foram atingidos.");
  }

  const searchPlanPrompt = [
    "O usuário já selecionou segmentos Meta e quer ADICIONAR mais com base no pedido abaixo.",
    "Gere termos de busca focados SOMENTE no que falta — não repita segmentos já escolhidos.",
    `Segmentos já selecionados (NÃO buscar equivalentes): ${keepItems.map((i) => i.name).join(", ")}`,
    `Pedido do usuário: ${args.addPrompt.trim()}`,
    "",
    "Responda APENAS JSON: { interestQueries, behaviorQueries, lifeEventQueries, demographicQueries }",
    "",
    "Persona:",
    JSON.stringify({
      personaName: persona.personaName,
      narrative: persona.narrative,
      traits: persona.traits,
      lifestyleCorrelates: persona.lifestyleCorrelates
    })
  ].join("\n");

  const searchPlanResult = await llmGenerateJson({
    provider: args.provider,
    prompt: searchPlanPrompt,
    schema: FallbackQueriesSchema,
    temperature: 0.25
  });

  const rawCatalog = filterCatalogByExclusions(
    (await buildCatalog(args.accessToken, searchPlanResult.data)).filter(
      (item) => !keepIds.has(item.id)
    ),
    brief.exclusionHints
  );

  if (!rawCatalog.length) {
    throw new Error(
      "Nenhum segmento novo encontrado na Meta para este pedido. Tente outros termos."
    );
  }

  const catalog = await enrichCatalogWithValidation(
    args.accessToken,
    args.adAccountId,
    rawCatalog
  );
  const rankedCatalog = await rankCatalogForPersona({
    provider: args.provider,
    persona,
    brief,
    catalog,
    maxItems: 50
  });

  const pickPrompt = [
    "Selecione APENAS segmentos NOVOS do catálogo para ADICIONAR aos já escolhidos.",
    "NÃO repita IDs já selecionados.",
    `IDs já selecionados: ${[...keepIds].join(", ")}`,
    `Máximo de novos por tipo — interesses: ${remaining.interest}, comportamentos: ${remaining.behavior}, demográficos: ${remaining.demographic}`,
    `Pedido do usuário: ${args.addPrompt.trim()}`,
    "",
    "Responda APENAS JSON: { interestIds: string[], behaviorIds: string[], demographicIds: string[] }",
    "",
    "Catálogo (somente IDs novos):",
    formatCatalogForPrompt(rankedCatalog)
  ].join("\n");

  const pickResult = await llmGenerateJson({
    provider: args.provider,
    prompt: pickPrompt,
    schema: IncrementalPickSchema,
    temperature: 0.2
  });

  const catalogIds = new Set(rankedCatalog.map((c) => c.id));
  const newPick = {
    interestIds: pickResult.data.interestIds
      .filter((id) => catalogIds.has(id) && !keepIds.has(id))
      .slice(0, remaining.interest),
    behaviorIds: pickResult.data.behaviorIds
      .filter((id) => catalogIds.has(id) && !keepIds.has(id))
      .slice(0, remaining.behavior),
    demographicIds: pickResult.data.demographicIds
      .filter((id) => catalogIds.has(id) && !keepIds.has(id))
      .slice(0, remaining.demographic)
  };

  if (!newPick.interestIds.length && !newPick.behaviorIds.length && !newPick.demographicIds.length) {
    throw new Error(
      "A IA não encontrou segmentos novos válidos para adicionar. Tente reformular o pedido."
    );
  }

  const mergedPick = mergeIncrementalPick(keepItems, newPick);
  const fullCatalog = dedupeCatalog([...keepItemsToCatalog(keepItems), ...rankedCatalog]);

  const targeting = args.personaOnly
    ? buildPersonaTargetingFromSuggestion({
        pick: mergedPick,
        catalog: fullCatalog,
        brief: {
          ageMin: brief.ageMin,
          ageMax: brief.ageMax,
          gender: persona.suggestedGender ?? brief.gender
        }
      })
    : buildMetaTargetingFromSuggestion({
        pick: mergedPick,
        catalog: fullCatalog,
        brief: {
          ...brief,
          gender: persona.suggestedGender ?? brief.gender
        }
      });

  const { targeting: validatedTargeting, removed } = await finalizeFlexibleSpecTargeting(
    targeting,
    args.accessToken,
    args.adAccountId
  );
  const removedIds = new Set(removed.map((row) => row.id));
  const items = suggestionItemsFromPick(mergedPick, fullCatalog).filter(
    (item) => !removedIds.has(item.id)
  );

  return {
    title: args.existingMeta.title,
    summary: args.existingMeta.summary,
    name: args.existingMeta.name,
    targeting: validatedTargeting,
    items,
    removedSegments: removed.length ? removed : undefined,
    includeCustomAudienceIds: args.existingMeta.includeCustomAudienceIds,
    excludeCustomAudienceIds: args.existingMeta.excludeCustomAudienceIds,
    provider: args.existingMeta.provider,
    modelUsed: pickResult.modelUsed || args.existingMeta.modelUsed
  };
}
