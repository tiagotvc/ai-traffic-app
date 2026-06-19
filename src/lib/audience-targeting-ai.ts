import "server-only";

import { z } from "zod";

import {
  TRAFFIC_AI_AUDIENCE_PREFIX,
  type AudienceTargetingSuggestion,
  type AudienceTargetingSuggestionItem
} from "@/lib/audience-targeting-shared";
import { llmGenerateJson } from "@/lib/llm/generate-json";
import {
  normalizeAudiencePickRaw,
  normalizeSearchPlanRaw,
  normalizeStringArray
} from "@/lib/llm/normalize-llm-json";
import type { LlmProviderId } from "@/lib/llm/types";
import {
  searchAdInterests,
  searchAdTargetingCategories
} from "@/lib/meta-graph";

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

const SearchPlanSchema = z.preprocess(
  normalizeSearchPlanRaw,
  z.object({
    interestQueries: z.array(z.string()).max(8).default([]),
    behaviorQueries: z.array(z.string()).max(6).default([]),
    demographicQueries: z.array(z.string()).max(4).default([])
  })
);

const PickSchema = z.preprocess(
  normalizeAudiencePickRaw,
  z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    name: z.string().min(1),
    age_min: z.number().int().min(13).max(65).optional(),
    age_max: z.number().int().min(13).max(65).optional(),
    genders: z.array(z.union([z.literal(1), z.literal(2)])).optional(),
    interestIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(12)).default([]),
    behaviorIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(8)).default([]),
    demographicIds: z.preprocess(normalizeStringArray, z.array(z.string()).max(6)).default([]),
    reasoning: z.string().optional()
  })
);

type CatalogItem = {
  type: "interest" | "behavior" | "demographic";
  id: string;
  name: string;
  audienceSize?: number;
};

function dedupeCatalog(items: CatalogItem[]): CatalogItem[] {
  const map = new Map<string, CatalogItem>();
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

async function buildCatalog(
  accessToken: string,
  plan: z.infer<typeof SearchPlanSchema>
): Promise<CatalogItem[]> {
  const rows: CatalogItem[] = [];

  await Promise.all([
    ...plan.interestQueries.map(async (q) => {
      const hits = await searchAdInterests(accessToken, q);
      for (const h of hits.slice(0, 8)) {
        rows.push({ type: "interest", id: h.id, name: h.name, audienceSize: h.audienceSize });
      }
    }),
    ...plan.behaviorQueries.map(async (q) => {
      const hits = await searchAdTargetingCategories(accessToken, q, "behaviors");
      for (const h of hits.slice(0, 6)) {
        rows.push({
          type: "behavior",
          id: h.id,
          name: h.name,
          audienceSize: h.audience_size
        });
      }
    }),
    ...plan.demographicQueries.map(async (q) => {
      const [demo, life] = await Promise.all([
        searchAdTargetingCategories(accessToken, q, "demographics"),
        searchAdTargetingCategories(accessToken, q, "life_events")
      ]);
      for (const h of [...demo, ...life].slice(0, 6)) {
        rows.push({
          type: "demographic",
          id: h.id,
          name: h.name,
          audienceSize: h.audience_size
        });
      }
    })
  ]);

  return dedupeCatalog(rows);
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

  for (const id of pick.interestIds) {
    const row = catalog.get(id);
    if (!row || row.type !== "interest") continue;
    if (!spec.interests) spec.interests = [];
    spec.interests.push({ id, name: row.name });
  }
  for (const id of pick.behaviorIds) {
    const row = catalog.get(id);
    if (!row || row.type !== "behavior") continue;
    if (!spec.behaviors) spec.behaviors = [];
    spec.behaviors.push({ id, name: row.name });
  }
  for (const id of pick.demographicIds) {
    const row = catalog.get(id);
    if (!row || row.type !== "demographic") continue;
    if (!spec.life_events) spec.life_events = [];
    spec.life_events.push({ id, name: row.name });
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
    age_min: args.pick.age_min ?? args.brief.ageMin ?? 18,
    age_max: args.pick.age_max ?? args.brief.ageMax ?? 65
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

  return targeting;
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

export async function generateAudienceTargetingSuggestion(args: {
  accessToken: string;
  provider: LlmProviderId;
  brief: AudienceTargetingBrief;
  clientName?: string;
  customAudiences?: Array<{ id: string; name?: string; subtype?: string }>;
}): Promise<AudienceTargetingSuggestion> {
  const brief = AudienceTargetingBriefSchema.parse(args.brief);

  const searchPrompt = [
    "Você é especialista em segmentação Meta Ads no Brasil.",
    "Com base no briefing, gere termos de busca em português para encontrar interesses, comportamentos e demografia na API da Meta.",
    "IMPORTANTE: renda e profissão NÃO são campos diretos — traduza em interesses/comportamentos correlatos (ex.: renda alta → viagens, marcas premium, golf).",
    "Responda APENAS JSON: { interestQueries: string[], behaviorQueries: string[], demographicQueries: string[] }",
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

  const searchPlan = await llmGenerateJson({
    provider: args.provider,
    prompt: searchPrompt,
    schema: SearchPlanSchema,
    temperature: 0.35
  });

  const catalog = await buildCatalog(args.accessToken, searchPlan.data);
  if (!catalog.length) {
    throw new Error(
      "Nenhum interesse ou comportamento encontrado na Meta para este briefing. Tente descrever com outras palavras."
    );
  }

  const pickPrompt = [
    "Selecione segmentos APENAS usando IDs do catálogo abaixo. Não invente IDs.",
    `Nome do público salvo deve começar com "${TRAFFIC_AI_AUDIENCE_PREFIX}" e ser descritivo.`,
    "Monte um público salvo (saved audience) com interesses/comportamentos/demografia.",
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
    "{ title, summary, name, age_min?, age_max?, genders?: [1|2], interestIds: string[], behaviorIds: string[], demographicIds: string[], reasoning? }",
    "",
    "Briefing:",
    JSON.stringify(brief),
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
    brief
  });

  return {
    title: pick.title,
    summary: pick.summary,
    name: ensureTrafficAiAudienceName(pick.name, args.clientName),
    targeting,
    items: suggestionItemsFromPick(pick, catalog),
    includeCustomAudienceIds: brief.includeCustomAudienceIds,
    excludeCustomAudienceIds: brief.excludeCustomAudienceIds,
    provider: args.provider,
    modelUsed: pickResult.modelUsed
  };
}
