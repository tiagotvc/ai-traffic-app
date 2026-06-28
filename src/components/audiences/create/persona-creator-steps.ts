export type PersonaCreatorStepKey =
  | "qualidade"
  | "genero"
  | "vendas"
  | "ofertas"
  | "quem"
  | "comportamento"
  | "estilo"
  | "exclusoes"
  | "objetivos"
  | "preview";

/** Grouped wizard sections — campaign-creator style cards. */
export type PersonaCreatorSectionKey =
  | "identity"
  | "commercial"
  | "launch"
  | "refinement"
  | "preview";

export const PERSONA_SECTION_ORDER: PersonaCreatorSectionKey[] = [
  "identity",
  "commercial",
  "launch",
  "refinement",
  "preview"
];

export const PERSONA_MACRO_SECTIONS: Record<1 | 2 | 3, PersonaCreatorSectionKey[]> = {
  1: ["identity", "commercial", "launch"],
  2: ["refinement"],
  3: ["preview"]
};

export const PERSONA_SECTION_META: Record<
  PersonaCreatorSectionKey,
  { titleKey: string; hintKey: string }
> = {
  identity: {
    titleKey: "personaSectionIdentityTitle",
    hintKey: "personaSectionIdentityHint"
  },
  commercial: {
    titleKey: "personaSectionCommercialTitle",
    hintKey: "personaSectionCommercialHint"
  },
  launch: {
    titleKey: "personaSectionLaunchTitle",
    hintKey: "personaSectionLaunchHint"
  },
  refinement: {
    titleKey: "personaSectionRefinementTitle",
    hintKey: "personaSectionRefinementHint"
  },
  preview: {
    titleKey: "personaStepPreview",
    hintKey: "personaSectionPreviewHint"
  }
};

export function macroStepForSection(section: PersonaCreatorSectionKey): 1 | 2 | 3 {
  if (section === "preview") return 3;
  if (section === "refinement") return 2;
  return 1;
}

export function nextPersonaSection(
  current: PersonaCreatorSectionKey
): PersonaCreatorSectionKey | null {
  const idx = PERSONA_SECTION_ORDER.indexOf(current);
  return PERSONA_SECTION_ORDER[idx + 1] ?? null;
}

export function prevPersonaSection(current: PersonaCreatorSectionKey): PersonaCreatorSectionKey | null {
  const idx = PERSONA_SECTION_ORDER.indexOf(current);
  return idx > 0 ? PERSONA_SECTION_ORDER[idx - 1]! : null;
}

export function personaSectionShowsField(
  section: PersonaCreatorSectionKey | undefined,
  field:
    | "provider"
    | "demographics"
    | "business"
    | "profile"
    | "behaviors"
    | "lifestyle"
    | "exclusions"
    | "objectives"
    | "metaSegments"
    | "preview",
  options?: { manual?: boolean }
): boolean {
  if (options?.manual && field === "provider") return false;
  if (field === "metaSegments") return options?.manual === true;
  if (!section) return true;
  const map: Record<PersonaCreatorSectionKey, Set<string>> = {
    identity: new Set(["demographics"]),
    commercial: new Set(["business", "profile"]),
    launch: new Set(["behaviors", "lifestyle"]),
    refinement: new Set(["exclusions", "objectives", "metaSegments"]),
    preview: new Set(["preview"])
  };
  return map[section].has(field);
}

export const PERSONA_STEP_ORDER: PersonaCreatorStepKey[] = [
  "qualidade",
  "genero",
  "vendas",
  "ofertas",
  "quem",
  "comportamento",
  "estilo",
  "exclusoes",
  "objetivos",
  "preview"
];

export const PERSONA_CREATOR_STEPS: Array<{ id: PersonaCreatorStepKey; labelKey: string }> = [
  { id: "qualidade", labelKey: "personaStepQualidade" },
  { id: "genero", labelKey: "personaStepGenero" },
  { id: "vendas", labelKey: "personaStepVendas" },
  { id: "ofertas", labelKey: "personaStepOfertas" },
  { id: "quem", labelKey: "personaStepQuem" },
  { id: "comportamento", labelKey: "personaStepComportamento" },
  { id: "estilo", labelKey: "personaStepEstilo" },
  { id: "exclusoes", labelKey: "personaStepExclusoes" },
  { id: "objetivos", labelKey: "personaStepObjetivos" },
  { id: "preview", labelKey: "personaStepPreview" }
];

/** @deprecated Use personaSectionShowsField */
export function personaStepShowsField(
  step: PersonaCreatorStepKey | undefined,
  field:
    | "provider"
    | "demographics"
    | "business"
    | "profile"
    | "behaviors"
    | "lifestyle"
    | "exclusions"
    | "objectives"
    | "metaSegments"
    | "preview"
): boolean {
  if (field === "metaSegments") return false;
  if (!step) return true;
  const map: Record<PersonaCreatorStepKey, Set<string>> = {
    qualidade: new Set(["provider", "business"]),
    genero: new Set(["demographics"]),
    vendas: new Set(["profile"]),
    ofertas: new Set(["profile"]),
    quem: new Set(["profile"]),
    comportamento: new Set(["behaviors"]),
    estilo: new Set(["lifestyle"]),
    exclusoes: new Set(["exclusions", "objectives"]),
    objetivos: new Set(["objectives"]),
    preview: new Set(["preview"])
  };
  return map[step].has(field);
}
