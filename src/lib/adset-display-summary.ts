import type { PersonaSummary } from "@/components/audiences/PersonasLibraryClient";
import type { ZoneSummary } from "@/components/audiences/ZonesLibraryClient";
import { extractPersonaTargetingItems } from "@/lib/audience-targeting-shared";
import { normalizeZoneGeoRules } from "@/lib/zone-geo-shared";

/** Meta Marketing API ad set name limit. */
export const META_ADSET_NAME_MAX_LENGTH = 400;

export function formatPersonaCardSummary(
  persona: PersonaSummary,
  genderLabel: string,
  interestsLabel: string
): string {
  const age = `${persona.ageMin}–${persona.ageMax}`;
  const segments = extractPersonaTargetingItems(persona.targeting);
  const interestNames = segments
    .filter((s) => s.type === "interest")
    .slice(0, 3)
    .map((s) => s.name);

  const parts = [`${age} · ${genderLabel}`];
  if (interestNames.length) {
    parts.push(`${interestsLabel}: ${interestNames.join(", ")}`);
  }
  return parts.join(" · ");
}

export function formatZoneHierarchySummary(zone: ZoneSummary, emptyLabel: string): string {
  const rules = normalizeZoneGeoRules(zone.geoRules);
  const parts: string[] = [];

  if (rules.countries?.length) {
    parts.push(rules.countries.join(", "));
  }

  if (rules.cities?.length) {
    const cityLabels = rules.cities.slice(0, 2).map((c) => c.key);
    parts.push(cityLabels.join(", "));
    if (rules.cities.length > 2) {
      parts.push(`+${rules.cities.length - 2}`);
    }
  }

  const pins = rules.customLocations ?? [];
  if (pins.length) {
    const pinLabels = pins
      .slice(0, 3)
      .map((p) => p.label?.trim() || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`);
    parts.push(pinLabels.join(" · "));
    if (pins.length > 3) {
      parts.push(`+${pins.length - 3}`);
    }
  }

  return parts.join(" › ") || emptyLabel;
}
