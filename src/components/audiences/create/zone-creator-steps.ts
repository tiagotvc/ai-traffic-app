export type ZoneCreatorSectionKey = "brief" | "places" | "review";

export const ZONE_SECTION_ORDER: ZoneCreatorSectionKey[] = ["brief", "places", "review"];

export const ZONE_MACRO_SECTIONS: Record<1 | 2 | 3, ZoneCreatorSectionKey[]> = {
  1: ["brief"],
  2: ["places"],
  3: ["review"]
};

export const ZONE_SECTION_META: Record<
  ZoneCreatorSectionKey,
  { titleKey: string; hintKey: string }
> = {
  brief: {
    titleKey: "zoneSectionBriefTitle",
    hintKey: "zoneSectionBriefHint"
  },
  places: {
    titleKey: "zoneSectionPlacesTitle",
    hintKey: "zoneSectionPlacesHint"
  },
  review: {
    titleKey: "zoneSectionReviewTitle",
    hintKey: "zoneSectionReviewHint"
  }
};

export function macroStepForZoneSection(section: ZoneCreatorSectionKey): 1 | 2 | 3 {
  if (section === "review") return 3;
  if (section === "places") return 2;
  return 1;
}

export function nextZoneSection(current: ZoneCreatorSectionKey): ZoneCreatorSectionKey | null {
  const idx = ZONE_SECTION_ORDER.indexOf(current);
  return ZONE_SECTION_ORDER[idx + 1] ?? null;
}

export function prevZoneSection(current: ZoneCreatorSectionKey): ZoneCreatorSectionKey | null {
  const idx = ZONE_SECTION_ORDER.indexOf(current);
  return idx > 0 ? ZONE_SECTION_ORDER[idx - 1]! : null;
}

export function zoneSectionShowsField(
  section: ZoneCreatorSectionKey | undefined,
  field: "provider" | "prompt" | "radius" | "preview" | "geocode" | "map" | "name"
): boolean {
  if (!section) return true;
  const map: Record<ZoneCreatorSectionKey, Set<string>> = {
    brief: new Set(["prompt", "radius"]),
    places: new Set(["preview", "geocode"]),
    review: new Set(["map", "name"])
  };
  return map[section].has(field);
}
