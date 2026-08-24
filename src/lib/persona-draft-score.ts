export type PersonaDraftScoreInput = {
  manualMode: boolean;
  businessDescription: string;
  targetProfile: string;
  behaviors: string;
  lifestyleHints: string;
  exclusionHints: string;
  savePersonaName: string;
  hasSuggestion: boolean;
  hasPersonaPreview: boolean;
  manualSegmentCount: number;
  ageMin: number;
  ageMax: number;
  gender: "all" | "male" | "female";
};

export type PersonaDraftScoreCheckKey =
  | "demographics"
  | "business"
  | "profile"
  | "behaviors"
  | "lifestyle"
  | "exclusions"
  | "finish";

export type PersonaDraftScoreChecklist = Record<PersonaDraftScoreCheckKey, boolean>;

export type PersonaDraftScoreCheckItem = {
  key: PersonaDraftScoreCheckKey;
  complete: boolean;
  /** Itens opcionais aparecem na lista como lembrete, mas não entram na pontuação. */
  optional: boolean;
};

export const PERSONA_DRAFT_SCORE_CHECK_KEYS: PersonaDraftScoreCheckKey[] = [
  "demographics",
  "business",
  "profile",
  "behaviors",
  "lifestyle",
  "exclusions",
  "finish"
];

/**
 * Exclusão é refinamento, não requisito: muita persona boa não tem público negativo.
 * Deixar isso pesando na nota fazia o campo parecer obrigatório.
 */
export const PERSONA_DRAFT_SCORE_OPTIONAL_KEYS: readonly PersonaDraftScoreCheckKey[] = ["exclusions"];

export function isPersonaDraftScoreCheckOptional(key: PersonaDraftScoreCheckKey): boolean {
  return PERSONA_DRAFT_SCORE_OPTIONAL_KEYS.includes(key);
}

function resolvedManualPersonaName(input: PersonaDraftScoreInput): string {
  const custom = input.savePersonaName.trim();
  if (custom) return custom;
  return (
    input.targetProfile.trim().slice(0, 120) || input.businessDescription.trim().slice(0, 80)
  );
}

function fieldFilled(value: string, minLength = 3): boolean {
  return value.trim().length >= minLength;
}

function demographicsComplete(input: PersonaDraftScoreInput): boolean {
  return (
    input.ageMin >= 13 &&
    input.ageMax <= 65 &&
    input.ageMin <= input.ageMax
  );
}

export function buildPersonaDraftScoreChecklist(input: PersonaDraftScoreInput): PersonaDraftScoreChecklist {
  return {
    demographics: demographicsComplete(input),
    business: fieldFilled(input.businessDescription),
    profile: fieldFilled(input.targetProfile),
    behaviors: fieldFilled(input.behaviors),
    lifestyle: fieldFilled(input.lifestyleHints),
    exclusions: fieldFilled(input.exclusionHints),
    finish: input.manualMode
      ? resolvedManualPersonaName(input).length > 0
      : input.hasSuggestion || input.hasPersonaPreview
  };
}

/** Ordered checklist items for sidebar / summary UI ({ key, complete }). */
export function buildPersonaDraftScoreCheckItems(input: PersonaDraftScoreInput): PersonaDraftScoreCheckItem[] {
  const checklist = buildPersonaDraftScoreChecklist(input);
  return PERSONA_DRAFT_SCORE_CHECK_KEYS.map((key) => ({
    key,
    complete: checklist[key],
    optional: isPersonaDraftScoreCheckOptional(key)
  }));
}

/** i18n message key for a checklist row (audiences or campaignCreator namespace). */
export function personaDraftScoreCheckLabelKey(
  key: PersonaDraftScoreCheckKey,
  manualMode: boolean
): { namespace: "audiences" | "campaignCreator"; messageKey: string } {
  switch (key) {
    case "demographics":
      return { namespace: "audiences", messageKey: "personaScoreCheckDemographics" };
    case "business":
      return { namespace: "campaignCreator", messageKey: "aiAudienceBusiness" };
    case "profile":
      return { namespace: "campaignCreator", messageKey: "aiAudienceProfile" };
    case "behaviors":
      return { namespace: "campaignCreator", messageKey: "aiAudienceBehaviors" };
    case "lifestyle":
      return { namespace: "campaignCreator", messageKey: "aiAudienceLifestyle" };
    case "exclusions":
      return { namespace: "campaignCreator", messageKey: "aiAudienceExclusions" };
    case "finish":
      return {
        namespace: "audiences",
        messageKey: manualMode ? "personaManualName" : "personaStepPreview"
      };
  }
}

/** Field-completion score for persona creator sidebar (mirrors campaign draft scoring). */
export function computePersonaDraftScore(input: PersonaDraftScoreInput): number {
  const required = buildPersonaDraftScoreCheckItems(input).filter((item) => !item.optional);
  if (!required.length) return 100;
  return Math.round((required.filter((item) => item.complete).length / required.length) * 100);
}

export function buildPersonaDraftScoreInput(args: {
  manualMode: boolean;
  businessDescription: string;
  targetProfile: string;
  behaviors: string;
  lifestyleHints: string;
  exclusionHints: string;
  savePersonaName: string;
  suggestion: unknown | null;
  personaPreview: unknown | null;
  manualSegmentCount?: number;
  ageMin: number;
  ageMax: number;
  gender: "all" | "male" | "female";
}): PersonaDraftScoreInput {
  return {
    manualMode: args.manualMode,
    businessDescription: args.businessDescription,
    targetProfile: args.targetProfile,
    behaviors: args.behaviors,
    lifestyleHints: args.lifestyleHints,
    exclusionHints: args.exclusionHints,
    savePersonaName: args.savePersonaName,
    hasSuggestion: args.suggestion != null,
    hasPersonaPreview: args.personaPreview != null,
    manualSegmentCount: args.manualSegmentCount ?? 0,
    ageMin: args.ageMin,
    ageMax: args.ageMax,
    gender: args.gender
  };
}

export const EMPTY_PERSONA_DRAFT_SCORE_INPUT: PersonaDraftScoreInput = buildPersonaDraftScoreInput({
  manualMode: false,
  businessDescription: "",
  targetProfile: "",
  behaviors: "",
  lifestyleHints: "",
  exclusionHints: "",
  savePersonaName: "",
  suggestion: null,
  personaPreview: null,
  ageMin: 18,
  ageMax: 65,
  gender: "all"
});
