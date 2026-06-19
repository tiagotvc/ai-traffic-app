import "server-only";

import { z } from "zod";

import {
  TRAFFIC_AI_AUDIENCE_PREFIX,
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
import { resolveFlexBucket, type MetaFlexSpecBucket } from "@/lib/meta-targeting-flex";
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
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  countries: z.array(z.string()).default(["BR"]),
  includeCustomAudienceIds: z.array(z.string()).default([]),
  excludeCustomAudienceIds: z.array(z.string()).default([])
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
      interestQueries: z.array(z.string()).max(8).default([]),
      behaviorQueries: z.array(z.string()).max(6).default([]),
      demographicQueries: z.array(z.string()).max(4).default([])
    })
  ),
  suggestedGender: z.enum(["all", "male", "female"]).optional()
});

export const AudiencePersonaPreviewSchema = z.preprocess(normalizePersonaRaw, PersonaCoreSchema);

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
    interestIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(12)).default([]),
    behaviorIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(8)).default([]),
    demographicIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(6)).default([]),
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

async function buildCatalog(accessToken: string, plan: SearchPlan): Promise<CatalogItem[]> {
  const rows: CatalogItem[] = [];

  await Promise.all([
    ...plan.interestQueries.map(async (q) => {
      const hits = await searchAdInterests(accessToken, q);
      for (const h of hits.slice(0, 8)) {
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
      for (const h of hits.slice(0, 6)) {
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
      for (const h of hits.slice(0, 6)) {
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

  return dedupeCatalog(rows);
}

async function enrichCatalogWithValidation(
  accessToken: string,
  adAccountId: string,
  catalog: CatalogItem[]
): Promise<CatalogItem[]> {
  const validated = await validateTargetingIdList(
    accessToken,
    adAccountId,
    catalog.map((c) => c.id)
  );
  const typeById = new Map(validated.map((v) => [v.id, v.type]));

  return catalog.map((item) => ({
    ...item,
    flexBucket: resolveFlexBucket({
      path: item.path,
      itemType: item.type,
      validatedType: typeById.get(item.id)
    })
  }));
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
  return [
    "Você é especialista em segmentação Meta Ads no Brasil.",
    "Sua tarefa NÃO é escolher um público pronto nem inventar IDs da Meta.",
    "Com base no briefing, construa uma PERSONA (perfil ideal) e traduza renda/profissão em correlatos de estilo de vida.",
    "Ex.: renda alta → viaja com frequência, marcas premium, golf — nunca use campos literais de renda ou cargo.",
    "Depois derive termos de busca em português para a API de targeting da Meta (interesses, comportamentos, demografia).",
    "NÃO defina faixa etária — idade é definida manualmente pelo usuário no formulário.",
    "",
    "Responda APENAS JSON:",
    "{",
    '  "personaName": string,',
    '  "narrative": string,',
    '  "traits": string[],',
    '  "lifestyleCorrelates": string[],',
    '  "searchPlan": {',
    '    "interestQueries": string[] (máx. 8),',
    '    "behaviorQueries": string[] (máx. 6),',
    '    "demographicQueries": string[] (máx. 4)',
    "  },",
    '  "suggestedGender"?: "all" | "male" | "female"',
    "}",
    "",
    "Briefing:",
    JSON.stringify({
      businessDescription: brief.businessDescription,
      targetProfile: brief.targetProfile,
      behaviors: brief.behaviors,
      lifestyleHints: brief.lifestyleHints,
      countries: brief.countries
    })
  ].join("\n");
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
    persona.searchPlan.demographicQueries.length > 0;

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
  const persona = AudiencePersonaPreviewSchema.parse(args.persona);

  const rawCatalog = await buildCatalog(args.accessToken, persona.searchPlan);
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

  const pickPrompt = [
    "Você recebeu uma PERSONA já validada pelo usuário e um CATÁLOGO real da Meta (IDs verificados).",
    "NÃO invente público nem IDs. Selecione somente segmentos do catálogo que combinem com a persona.",
    `Nome do público salvo deve começar com "${TRAFFIC_AI_AUDIENCE_PREFIX}" e ser descritivo.`,
    brief.includeCustomAudienceIds.length
      ? `Inclua estes custom audiences no targeting final (já reservados): ${brief.includeCustomAudienceIds.join(", ")}`
      : "",
    brief.excludeCustomAudienceIds.length
      ? `Exclua estes custom audiences: ${brief.excludeCustomAudienceIds.join(", ")}`
      : "",
    args.customAudiences?.length
      ? `Custom audiences disponíveis: ${JSON.stringify(args.customAudiences.slice(0, 20))}`
      : "",
    "",
    "Responda APENAS JSON:",
    "{ title, summary, name, genders?: [1|2], interestIds: string[], behaviorIds: string[], demographicIds: string[], reasoning? }",
    "Não inclua age_min nem age_max — a idade vem do formulário do usuário.",
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
    "Catálogo (use somente estes IDs):",
    formatCatalogForPrompt(catalog)
  ]
    .filter(Boolean)
    .join("\n");

  const pickResult = await llmGenerateJson({
    provider: args.provider,
    prompt: pickPrompt,
    schema: PickSchema,
    temperature: 0.2
  });

  const catalogIds = new Set(catalog.map((c) => c.id));
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
    catalog,
    brief: {
      ...brief,
      gender: persona.suggestedGender ?? brief.gender
    }
  });

  return {
    title: pick.title,
    summary: `${persona.personaName}: ${pick.summary}`,
    name: ensureTrafficAiAudienceName(pick.name, args.clientName),
    targeting,
    items: suggestionItemsFromPick(pick, catalog),
    includeCustomAudienceIds: brief.includeCustomAudienceIds,
    excludeCustomAudienceIds: brief.excludeCustomAudienceIds,
    provider: args.provider,
    modelUsed: pickResult.modelUsed
  };
}
