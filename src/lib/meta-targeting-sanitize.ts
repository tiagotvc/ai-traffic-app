import "server-only";

import { isMetaFlexSpecBucket } from "@/lib/meta-targeting-flex";

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "geo_locations",
  "age_min",
  "age_max",
  "genders",
  "flexible_spec",
  "custom_audiences",
  "excluded_custom_audiences",
  "locales"
]);

function clampAge(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(13, Math.min(65, Math.round(n)));
}

function sanitizeIdList(raw: unknown): Array<{ id: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ id: string }> = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({ id: item.trim() });
      continue;
    }
    if (item && typeof item === "object" && "id" in item) {
      const id = String((item as { id: unknown }).id ?? "").trim();
      if (id) out.push({ id });
    }
  }
  return out;
}

function sanitizeFlexibleSpec(raw: unknown): Array<Record<string, Array<{ id: string }>>> {
  if (!Array.isArray(raw)) return [];

  const groups: Array<Record<string, Array<{ id: string }>>> = [];

  for (const group of raw) {
    if (!group || typeof group !== "object") continue;
    const spec: Record<string, Array<{ id: string }>> = {};

    for (const [key, value] of Object.entries(group as Record<string, unknown>)) {
      if (!isMetaFlexSpecBucket(key)) continue;
      const ids = sanitizeIdList(value);
      if (ids.length) spec[key] = ids;
    }

    if (Object.keys(spec).length) groups.push(spec);
  }

  return groups;
}

function sanitizeGeoLocations(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return { countries: ["BR"] };
  const geo = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  const countries = geo.countries;
  if (Array.isArray(countries) && countries.length) {
    out.countries = countries.map((c) => String(c).trim()).filter(Boolean);
  }

  const cities = geo.cities;
  if (Array.isArray(cities) && cities.length) {
    out.cities = cities
      .filter((c) => c && typeof c === "object")
      .map((c) => {
        const city = c as Record<string, unknown>;
        const key = String(city.key ?? "").trim();
        if (!key) return null;
        const entry: Record<string, unknown> = { key };
        if (city.radius != null) entry.radius = Number(city.radius) || 10;
        if (city.distance_unit === "mile" || city.distance_unit === "kilometer") {
          entry.distance_unit = city.distance_unit;
        }
        return entry;
      })
      .filter(Boolean);
  }

  const regions = geo.regions;
  if (Array.isArray(regions) && regions.length) {
    out.regions = regions
      .filter((r) => r && typeof r === "object")
      .map((r) => {
        const region = r as Record<string, unknown>;
        const key = String(region.key ?? "").trim();
        return key ? { key } : null;
      })
      .filter(Boolean);
  }

  if (!out.countries && !out.cities && !out.regions) {
    return { countries: ["BR"] };
  }
  if (!out.countries) out.countries = ["BR"];
  return out;
}

/**
 * Remove campos narrativos (persona, briefing) e mantém apenas targeting aceito pela Meta.
 */
export function sanitizeTargetingForMeta(
  targeting: Record<string, unknown>
): Record<string, unknown> {
  const ageMin = clampAge(targeting.age_min, 18);
  const ageMax = clampAge(targeting.age_max, 65);
  const out: Record<string, unknown> = {
    geo_locations: sanitizeGeoLocations(targeting.geo_locations),
    age_min: ageMin,
    age_max: ageMax
  };

  if (ageMin > ageMax) {
    out.age_min = ageMax;
    out.age_max = ageMin;
  }

  const genders = targeting.genders;
  if (Array.isArray(genders) && genders.length) {
    out.genders = genders
      .map((g) => Number(g))
      .filter((g) => g === 1 || g === 2);
  }

  const flex = sanitizeFlexibleSpec(targeting.flexible_spec);
  if (flex.length) out.flexible_spec = flex;

  const custom = sanitizeIdList(targeting.custom_audiences);
  if (custom.length) out.custom_audiences = custom;

  const excluded = sanitizeIdList(targeting.excluded_custom_audiences);
  if (excluded.length) out.excluded_custom_audiences = excluded;

  const locales = targeting.locales;
  if (Array.isArray(locales) && locales.length) {
    out.locales = locales.map((l) => Number(l)).filter((n) => Number.isFinite(n));
  }

  // Garantia extra: nenhuma chave fora do contrato da Meta.
  for (const key of Object.keys(out)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) delete out[key];
  }

  return out;
}
