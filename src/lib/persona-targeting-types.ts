export type PersonaSegmentType = "interest" | "behavior" | "demographic";

export type PersonaSegmentInfo = {
  id: string;
  name: string;
  type: PersonaSegmentType;
  valid: boolean;
};

export type PersonaSegmentReplacement = {
  invalidId: string;
  invalidName: string;
  replacement: { id: string; name: string; type: PersonaSegmentType } | null;
};

export type PersonaTargetingIssue = {
  personaId: string;
  personaName: string;
  description: string | null;
  sourcePrompt: string | null;
  ageMin: number;
  ageMax: number;
  gender: string;
  segments: PersonaSegmentInfo[];
  invalidSegments: PersonaSegmentInfo[];
  validSegments: PersonaSegmentInfo[];
  replacements: PersonaSegmentReplacement[];
  allSegmentsInvalid: boolean;
};

export type PersonaTargetingSummary = {
  personaId: string;
  personaName: string;
  valid: boolean;
  segments: PersonaSegmentInfo[];
};

export type PersonaRepairSeed = {
  personaId: string;
  name: string;
  description: string | null;
  sourcePrompt: string | null;
  ageMin: number;
  ageMax: number;
  gender: "all" | "male" | "female";
  rejectedSegmentIds: string[];
  segments: PersonaSegmentInfo[];
  /** Substituições já encontradas na Meta (painel de auditoria). */
  metaReplacements?: PersonaSegmentReplacement[];
};

export function parsePersonaSourcePrompt(sourcePrompt: string | null | undefined): {
  businessDescription: string;
  targetProfile: string;
  behaviors: string;
  lifestyleHints: string;
} {
  if (!sourcePrompt?.trim()) {
    return { businessDescription: "", targetProfile: "", behaviors: "", lifestyleHints: "" };
  }
  const lines = sourcePrompt.split("\n").map((l) => l.trim());
  return {
    businessDescription: lines[0] ?? "",
    targetProfile: lines[1] ?? "",
    behaviors: lines[2] ?? "",
    lifestyleHints: lines[3] ?? ""
  };
}

/** Preenche o briefing de reparo quando sourcePrompt não foi salvo na criação. */
export function buildRepairBriefFromIssue(issue: {
  sourcePrompt: string | null;
  description: string | null;
  personaName: string;
}): {
  businessDescription: string;
  targetProfile: string;
  behaviors: string;
  lifestyleHints: string;
} {
  const parsed = parsePersonaSourcePrompt(issue.sourcePrompt);
  if (parsed.businessDescription.trim() || parsed.targetProfile.trim()) {
    return parsed;
  }
  const profile = issue.description?.trim() || issue.personaName;
  return {
    businessDescription: issue.personaName,
    targetProfile: profile,
    behaviors: parsed.behaviors,
    lifestyleHints: parsed.lifestyleHints
  };
}

/** Prévia de persona para fluxo de reparo sem regerar o passo 1. */
export function buildRepairPersonaPreview(seed: PersonaRepairSeed): {
  personaName: string;
  narrative: string;
  traits: string[];
  lifestyleCorrelates: string[];
  searchPlan: {
    interestQueries: string[];
    behaviorQueries: string[];
    demographicQueries: string[];
  };
  suggestedGender?: "all" | "male" | "female";
  provider: "gemini";
  modelUsed: string;
} {
  const rejected = seed.segments.filter((s) => !s.valid);
  const valid = seed.segments.filter((s) => s.valid);
  const narrative =
    seed.description?.trim() ||
    (valid.length ? valid.map((s) => s.name).join(", ") : seed.name);

  const byType = (type: PersonaSegmentInfo["type"], items: PersonaSegmentInfo[]) =>
    items.filter((s) => s.type === type).map((s) => s.name);

  return {
    personaName: seed.name,
    narrative,
    traits: valid.slice(0, 8).map((s) => s.name),
    lifestyleCorrelates: rejected.slice(0, 4).map((s) => s.name),
    searchPlan: {
      interestQueries: [
        ...byType("interest", rejected),
        ...byType("interest", valid)
      ].slice(0, 8),
      behaviorQueries: [
        ...byType("behavior", rejected),
        ...byType("behavior", valid)
      ].slice(0, 6),
      demographicQueries: [
        ...byType("demographic", rejected),
        ...byType("demographic", valid)
      ].slice(0, 4)
    },
    suggestedGender: seed.gender,
    provider: "gemini",
    modelUsed: "repair-seed"
  };
}
