/** Buckets aceitos em flexible_spec (paridade com targetingvalidation da Meta). */
export const META_FLEX_SPEC_BUCKETS = [
  "interests",
  "education_statuses",
  "education_schools",
  "education_majors",
  "work_positions",
  "work_employers",
  "interested_in",
  "relationship_statuses",
  "college_years",
  "family_statuses",
  "industries",
  "life_events",
  "political_views",
  "politics",
  "behaviors",
  "income",
  "net_worth",
  "home_type",
  "home_ownership",
  "home_value",
  "ethnic_affinity",
  "generation",
  "household_composition",
  "moms",
  "office_type",
  "user_adclusters"
] as const;

export type MetaFlexSpecBucket = (typeof META_FLEX_SPEC_BUCKETS)[number];

const BUCKET_SET = new Set<string>(META_FLEX_SPEC_BUCKETS);

export function isMetaFlexSpecBucket(value: string): value is MetaFlexSpecBucket {
  return BUCKET_SET.has(value);
}

/** Mapeia path/nome da Meta para o bucket correto do flexible_spec. */
export function resolveFlexBucket(args: {
  path?: string[];
  itemType?: "interest" | "behavior" | "demographic";
  validatedType?: string;
}): MetaFlexSpecBucket {
  const validated = args.validatedType?.trim();
  if (validated && isMetaFlexSpecBucket(validated)) return validated;

  if (args.itemType === "interest") return "interests";
  if (args.itemType === "behavior") return "behaviors";

  const joined = (args.path ?? []).join(" / ").toLowerCase();
  if (joined.includes("life event")) return "life_events";
  if (joined.includes("education")) return "education_statuses";
  if (joined.includes("income") || joined.includes("renda")) return "income";
  if (joined.includes("industr")) return "industries";
  if (joined.includes("family")) return "family_statuses";
  if (joined.includes("relationship")) return "relationship_statuses";
  if (joined.includes("work") || joined.includes("employ")) return "work_positions";
  if (joined.includes("behavior")) return "behaviors";
  if (joined.includes("interest")) return "interests";

  return "behaviors";
}
