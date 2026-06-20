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
};

export type AudiencePersonaSearchPlan = {
  interestQueries: string[];
  behaviorQueries: string[];
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
