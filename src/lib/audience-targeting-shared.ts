import type { TargetingItem } from "@/components/MetaTargetingSelect";
import type { DraftTargeting } from "@/lib/campaign-draft";
import type { LlmProviderId } from "@/lib/llm/types";

export const TRAFFIC_AI_AUDIENCE_PREFIX = "[Traffic AI]";

export type AudienceTargetingSuggestionItem = {
  type: "interest" | "behavior" | "demographic";
  id: string;
  name: string;
  reason?: string;
};

export type AudienceTargetingSuggestion = {
  title: string;
  summary: string;
  name: string;
  targeting: Record<string, unknown>;
  items: AudienceTargetingSuggestionItem[];
  includeCustomAudienceIds: string[];
  excludeCustomAudienceIds: string[];
  provider: LlmProviderId;
  modelUsed: string;
  /** Segmentos removidos porque a Meta os marcou como inválidos/descontinuados. */
  removedSegments?: Array<{ id: string; name?: string }>;
  /** Alternativas válidas encontradas na Meta para segmentos rejeitados (antes do pick da IA). */
  replacementHints?: Array<{
    rejected: { id: string; name: string; type: "interest" | "behavior" | "demographic" };
    alternatives: Array<{ id: string; name: string; type: "interest" | "behavior" | "demographic" }>;
  }>;
};

export type AudiencePersonaSearchPlan = {
  interestQueries: string[];
  behaviorQueries: string[];
  lifeEventQueries?: string[];
  demographicQueries: string[];
};

export type AudiencePersonaPreview = {
  personaName: string;
  narrative: string;
  traits: string[];
  lifestyleCorrelates: string[];
  searchPlan: AudiencePersonaSearchPlan;
  suggestedGender?: "all" | "male" | "female";
  provider: LlmProviderId;
  modelUsed: string;
};

export function applySuggestionToDraftTargeting(
  current: DraftTargeting,
  suggestion: AudienceTargetingSuggestion
): DraftTargeting {
  const targeting = suggestion.targeting;
  const flex = targeting.flexible_spec as Array<Record<string, unknown>> | undefined;

  const interests: TargetingItem[] = [];
  const detailedGroups: DraftTargeting["detailedGroups"] = [];

  if (flex?.length) {
    for (const spec of flex) {
      const groupItems: TargetingItem[] = [];
      const interestsRaw = (spec.interests as Array<{ id: string; name?: string }>) ?? [];
      const behaviorsRaw = (spec.behaviors as Array<{ id: string; name?: string }>) ?? [];

      for (const i of interestsRaw) {
        groupItems.push({
          value: i.id,
          label: i.name ?? i.id,
          meta: { kind: "interest" }
        });
      }
      for (const b of behaviorsRaw) {
        groupItems.push({
          value: b.id,
          label: b.name ?? b.id,
          meta: { kind: "behavior" }
        });
      }

      for (const [key, value] of Object.entries(spec)) {
        if (key === "interests" || key === "behaviors") continue;
        const rows = value as Array<{ id: string; name?: string }> | undefined;
        for (const d of rows ?? []) {
          groupItems.push({
            value: d.id,
            label: d.name ?? d.id,
            meta: { kind: "demographic", bucket: key }
          });
        }
      }

      if (groupItems.length) detailedGroups.push({ items: groupItems });
    }
  }

  for (const item of suggestion.items.filter((i) => i.type === "interest")) {
    if (!interests.some((x) => x.value === item.id)) {
      interests.push({ value: item.id, label: item.name, meta: { kind: "interest" } });
    }
  }

  const ageMin = typeof targeting.age_min === "number" ? targeting.age_min : current.ageMin;
  const ageMax = typeof targeting.age_max === "number" ? targeting.age_max : current.ageMax;
  const genders = targeting.genders as number[] | undefined;
  let gender: DraftTargeting["gender"] = current.gender;
  if (genders?.length === 1 && genders[0] === 1) gender = "male";
  if (genders?.length === 1 && genders[0] === 2) gender = "female";

  const includeIds = [
    ...new Set([...current.customAudienceIds, ...suggestion.includeCustomAudienceIds])
  ];
  const excludeIds = [
    ...new Set([...current.excludedAudienceIds, ...suggestion.excludeCustomAudienceIds])
  ];

  return {
    ...current,
    ageMin,
    ageMax,
    gender,
    interests: detailedGroups.length ? [] : interests.length ? interests : current.interests,
    detailedGroups: detailedGroups.length ? detailedGroups : current.detailedGroups,
    customAudienceIds: includeIds,
    excludedAudienceIds: excludeIds
  };
}

export type PersonaTargetingItem = {
  type: "interest" | "behavior" | "demographic";
  id: string;
  name: string;
  bucket?: string;
};

export function extractPersonaTargetingItems(
  targeting: Record<string, unknown>
): PersonaTargetingItem[] {
  const items: PersonaTargetingItem[] = [];
  const flex = targeting.flexible_spec as Array<Record<string, unknown>> | undefined;

  for (const spec of flex ?? []) {
    for (const row of (spec.interests as Array<{ id: string; name?: string }>) ?? []) {
      items.push({ type: "interest", id: row.id, name: row.name ?? row.id });
    }
    for (const row of (spec.behaviors as Array<{ id: string; name?: string }>) ?? []) {
      items.push({ type: "behavior", id: row.id, name: row.name ?? row.id });
    }
    for (const [key, value] of Object.entries(spec)) {
      if (key === "interests" || key === "behaviors") continue;
      for (const row of (value as Array<{ id: string; name?: string }>) ?? []) {
        items.push({
          type: "demographic",
          id: row.id,
          name: row.name ?? row.id,
          bucket: key
        });
      }
    }
  }

  return items;
}

export const META_SEGMENT_LIMITS = {
  interest: 20,
  behavior: 16,
  demographic: 10
} as const;

export type SegmentType = keyof typeof META_SEGMENT_LIMITS;

export function countSegmentsByType(
  items: Array<{ type: SegmentType }>
): Record<SegmentType, number> {
  return {
    interest: items.filter((i) => i.type === "interest").length,
    behavior: items.filter((i) => i.type === "behavior").length,
    demographic: items.filter((i) => i.type === "demographic").length
  };
}

export function canAddMoreSegments(
  items: Array<{ type: SegmentType }>
): boolean {
  const counts = countSegmentsByType(items);
  return (
    counts.interest < META_SEGMENT_LIMITS.interest ||
    counts.behavior < META_SEGMENT_LIMITS.behavior ||
    counts.demographic < META_SEGMENT_LIMITS.demographic
  );
}

function removeSegmentFromTargeting(
  targeting: Record<string, unknown>,
  itemId: string
): Record<string, unknown> {
  const flex = targeting.flexible_spec as Array<Record<string, unknown>> | undefined;
  if (!flex?.length) return targeting;

  const nextFlex = flex
    .map((spec) => {
      const next: Record<string, unknown> = { ...spec };
      for (const key of Object.keys(next)) {
        const rows = next[key] as Array<{ id: string }> | undefined;
        if (!Array.isArray(rows)) continue;
        const filtered = rows.filter((r) => r.id !== itemId);
        if (filtered.length) next[key] = filtered;
        else delete next[key];
      }
      return next;
    })
    .filter((spec) => Object.keys(spec).length > 0);

  const t = { ...targeting };
  if (nextFlex.length) t.flexible_spec = nextFlex;
  else delete t.flexible_spec;
  return t;
}

export function removeSegmentFromSuggestion(
  suggestion: AudienceTargetingSuggestion,
  itemId: string
): AudienceTargetingSuggestion {
  return {
    ...suggestion,
    items: suggestion.items.filter((i) => i.id !== itemId),
    targeting: removeSegmentFromTargeting(suggestion.targeting, itemId)
  };
}

/** Build Meta flexible_spec from manually picked segment chips (no AI). */
export function buildFlexibleSpecFromSegmentItems(
  items: AudienceTargetingSuggestionItem[]
): Array<Record<string, Array<{ id: string; name: string }>>> {
  const spec: Record<string, Array<{ id: string; name: string }>> = {};

  for (const item of items) {
    const bucket =
      item.type === "interest"
        ? "interests"
        : item.type === "behavior"
          ? "behaviors"
          : "life_events";
    if (!spec[bucket]) spec[bucket] = [];
    if (!spec[bucket]!.some((row) => row.id === item.id)) {
      spec[bucket]!.push({ id: item.id, name: item.name });
    }
  }

  return Object.keys(spec).length ? [spec] : [];
}

export function mergeSuggestionSegments(
  existing: AudienceTargetingSuggestionItem[],
  added: AudienceTargetingSuggestionItem[]
): AudienceTargetingSuggestionItem[] {
  const seen = new Set(existing.map((i) => i.id));
  const counts = countSegmentsByType(existing);
  const merged = [...existing];

  for (const item of added) {
    if (seen.has(item.id)) continue;
    if (counts[item.type] >= META_SEGMENT_LIMITS[item.type]) continue;
    merged.push(item);
    seen.add(item.id);
    counts[item.type]++;
  }

  return merged;
}
