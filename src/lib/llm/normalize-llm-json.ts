export function unwrapLlmObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  for (const key of ["data", "result", "audience", "response", "output"]) {
    const nested = record[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return unwrapLlmObject(nested);
    }
  }
  return record;
}

function firstDefined<T>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

export function pickString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function pickNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return Math.trunc(parsed);
    }
  }
  return undefined;
}

export function normalizeStringArray(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item).trim();
      if (item && typeof item === "object" && "id" in item) {
        return String((item as { id: unknown }).id).trim();
      }
      if (item && typeof item === "object" && "name" in item) {
        return String((item as { name: unknown }).name).trim();
      }
      return "";
    })
    .filter(Boolean);
}

export function clampUniqueStrings(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

export function pickStringArray(record: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    if (key in record) return normalizeStringArray(record[key]);
  }
  return [];
}

export function normalizeGenders(value: unknown): Array<1 | 2> | undefined {
  if (value === 1 || value === "1" || value === "male" || value === "homens") return [1];
  if (value === 2 || value === "2" || value === "female" || value === "mulheres") return [2];
  if (!Array.isArray(value)) return undefined;
  const mapped = value
    .map((item) => {
      if (item === 1 || item === "1" || item === "male") return 1 as const;
      if (item === 2 || item === "2" || item === "female") return 2 as const;
      return null;
    })
    .filter((item): item is 1 | 2 => item !== null);
  return mapped.length ? mapped : undefined;
}

export function normalizeSearchPlanRaw(raw: unknown): unknown {
  const record = unwrapLlmObject(raw);
  const nested =
    record.searchPlan && typeof record.searchPlan === "object"
      ? (record.searchPlan as Record<string, unknown>)
      : record.metaSearchPlan && typeof record.metaSearchPlan === "object"
        ? (record.metaSearchPlan as Record<string, unknown>)
        : record;
  const planRecord = nested === record ? record : nested;
  return {
    interestQueries: clampUniqueStrings(
      pickStringArray(
        planRecord,
        "interestQueries",
        "interest_queries",
        "interests",
        "interestSearch",
        "interest_search"
      ),
      12
    ),
    behaviorQueries: clampUniqueStrings(
      pickStringArray(
        planRecord,
        "behaviorQueries",
        "behavior_queries",
        "behaviors",
        "behaviorSearch",
        "behavior_search"
      ),
      12
    ),
    lifeEventQueries: clampUniqueStrings(
      pickStringArray(
        planRecord,
        "lifeEventQueries",
        "life_event_queries",
        "lifeEvents",
        "life_events"
      ),
      8
    ),
    demographicQueries: clampUniqueStrings(
      pickStringArray(
        planRecord,
        "demographicQueries",
        "demographic_queries",
        "demographics",
        "demographicSearch",
        "demographic_search"
      ),
      8
    )
  };
}

export function normalizePersonaRaw(raw: unknown): unknown {
  const record = unwrapLlmObject(raw);
  const searchPlan = normalizeSearchPlanRaw(
    record.searchPlan ?? record.metaSearchPlan ?? record
  ) as AudiencePersonaSearchPlanShape;

  const genderRaw = pickString(record, "suggestedGender", "suggested_gender", "gender");
  let suggestedGender: "all" | "male" | "female" | undefined;
  if (genderRaw === "male" || genderRaw === "homens" || genderRaw === "masculino") {
    suggestedGender = "male";
  } else if (genderRaw === "female" || genderRaw === "mulheres" || genderRaw === "feminino") {
    suggestedGender = "female";
  } else if (genderRaw === "all" || genderRaw === "todos") {
    suggestedGender = "all";
  }

  return {
    personaName:
      pickString(record, "personaName", "persona_name", "name", "title", "nome") ?? "",
    narrative:
      pickString(record, "narrative", "summary", "description", "persona", "resumo") ?? "",
    traits: clampUniqueStrings(
      pickStringArray(record, "traits", "caracteristicas", "characteristics"),
      8
    ),
    lifestyleCorrelates: clampUniqueStrings(
      pickStringArray(
        record,
        "lifestyleCorrelates",
        "lifestyle_correlates",
        "correlates",
        "correlatos",
        "metaSearchAngles",
        "meta_search_angles"
      ),
      12
    ),
    searchPlan,
    suggestedGender
  };
}

type AudiencePersonaSearchPlanShape = {
  interestQueries: string[];
  behaviorQueries: string[];
  lifeEventQueries?: string[];
  demographicQueries: string[];
};

export function normalizeAudiencePickRaw(raw: unknown): unknown {
  const record = unwrapLlmObject(raw);
  return {
    title: pickString(record, "title", "titulo") ?? "",
    summary: pickString(record, "summary", "description", "descricao", "resumo") ?? "",
    name: pickString(record, "name", "audienceName", "audience_name", "nome") ?? "",
    age_min: pickNumber(record, "age_min", "ageMin", "age_minimo"),
    age_max: pickNumber(record, "age_max", "ageMax", "age_maximo"),
    genders: normalizeGenders(firstDefined(record.genders, record.gender, record.genero)),
    interestIds: clampUniqueStrings(
      pickStringArray(record, "interestIds", "interest_ids", "interests"),
      20
    ),
    behaviorIds: clampUniqueStrings(
      pickStringArray(record, "behaviorIds", "behavior_ids", "behaviors"),
      16
    ),
    demographicIds: clampUniqueStrings(
      pickStringArray(
        record,
        "demographicIds",
        "demographic_ids",
        "demographics",
        "life_events"
      ),
      10
    ),
    reasoning: pickString(record, "reasoning", "reason", "raciocinio")
  };
}
