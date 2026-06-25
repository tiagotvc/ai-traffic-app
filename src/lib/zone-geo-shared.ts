import type { ZoneGeoRules } from "@/db/entities/UserZone";

export type ZoneCustomLocation = NonNullable<ZoneGeoRules["customLocations"]>[number];

export type ZoneMapPin = {
  key: string;
  latitude: number;
  longitude: number;
  radius: number;
  distanceUnit: "kilometer" | "mile";
  label?: string;
  mode: "include" | "exclude";
};

function coerceCoord(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function coerceRadius(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(70, Math.max(1, Math.round(n)));
}

/** Raio em km aceito pela Meta (inteiro entre 1 e 70). */
export function normalizeMetaRadiusKm(value: unknown): number {
  return coerceRadius(value);
}

export function normalizeZoneCustomLocation(
  loc: Partial<ZoneCustomLocation> & { latitude?: unknown; longitude?: unknown; radius?: unknown }
): ZoneCustomLocation | null {
  const latitude = coerceCoord(loc.latitude);
  const longitude = coerceCoord(loc.longitude);
  if (latitude == null || longitude == null) return null;

  return {
    latitude,
    longitude,
    radius: coerceRadius(loc.radius),
    distanceUnit: loc.distanceUnit === "mile" ? "mile" : "kilometer",
    label: typeof loc.label === "string" && loc.label.trim() ? loc.label.trim() : undefined
  };
}

export function normalizeZoneGeoRules(rules?: ZoneGeoRules | null): ZoneGeoRules {
  if (!rules || typeof rules !== "object") {
    return { customLocations: [], excludedCustomLocations: [] };
  }

  const customLocations = (rules.customLocations ?? [])
    .map((loc) => normalizeZoneCustomLocation(loc))
    .filter((loc): loc is ZoneCustomLocation => loc != null);

  const excludedCustomLocations = (rules.excludedCustomLocations ?? [])
    .map((loc) => normalizeZoneCustomLocation(loc))
    .filter((loc): loc is ZoneCustomLocation => loc != null);

  return {
    countries: Array.isArray(rules.countries) ? rules.countries : undefined,
    cities: Array.isArray(rules.cities) ? rules.cities : undefined,
    customLocations,
    excludedCustomLocations
  };
}

export function zoneLocationKey(loc: Pick<ZoneCustomLocation, "latitude" | "longitude">): string {
  const latitude = coerceCoord(loc.latitude) ?? 0;
  const longitude = coerceCoord(loc.longitude) ?? 0;
  return `${latitude.toFixed(5)}_${longitude.toFixed(5)}`;
}

export function zonePinSelectionKey(pin: Pick<ZoneMapPin, "mode" | "key">): string {
  return `${pin.mode}:${pin.key}`;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Pin cujo raio contém o clique — prioriza o centro mais próximo. */
export function findPinAtLocation(pins: ZoneMapPin[], lat: number, lng: number): ZoneMapPin | null {
  let best: { pin: ZoneMapPin; dist: number } | null = null;

  for (const pin of pins) {
    const dist = haversineMeters(lat, lng, pin.latitude, pin.longitude);
    if (dist > pin.radius * 1000) continue;
    if (!best || dist < best.dist) {
      best = { pin, dist };
    }
  }

  return best?.pin ?? null;
}

export function zoneCustomLocationToPin(
  loc: ZoneCustomLocation,
  mode: "include" | "exclude"
): ZoneMapPin {
  const normalized = normalizeZoneCustomLocation(loc);
  if (!normalized) {
    throw new Error("Invalid zone location");
  }
  return {
    key: zoneLocationKey(normalized),
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    radius: normalized.radius,
    distanceUnit: normalized.distanceUnit,
    label: normalized.label,
    mode
  };
}

export function zoneGeoRulesToMapPins(rules: ZoneGeoRules): ZoneMapPin[] {
  const normalized = normalizeZoneGeoRules(rules);
  const included = (normalized.customLocations ?? []).flatMap((loc) => {
    const pin = normalizeZoneCustomLocation(loc);
    if (!pin) return [];
    return [zoneCustomLocationToPin(pin, "include")];
  });
  const excluded = (normalized.excludedCustomLocations ?? []).flatMap((loc) => {
    const pin = normalizeZoneCustomLocation(loc);
    if (!pin) return [];
    return [zoneCustomLocationToPin(pin, "exclude")];
  });
  return [...included, ...excluded];
}

export function excludeZoneLocation(rules: ZoneGeoRules, key: string): ZoneGeoRules {
  const normalized = normalizeZoneGeoRules(rules);
  const loc = normalized.customLocations?.find((row) => zoneLocationKey(row) === key);
  if (!loc) return normalized;

  const customLocations = (normalized.customLocations ?? []).filter((row) => zoneLocationKey(row) !== key);
  const excludedCustomLocations = [...(normalized.excludedCustomLocations ?? []), loc];

  return { ...normalized, customLocations, excludedCustomLocations };
}

export function restoreZoneLocation(rules: ZoneGeoRules, key: string): ZoneGeoRules {
  const normalized = normalizeZoneGeoRules(rules);
  const loc = normalized.excludedCustomLocations?.find((row) => zoneLocationKey(row) === key);
  if (!loc) return normalized;

  const excludedCustomLocations = (normalized.excludedCustomLocations ?? []).filter(
    (row) => zoneLocationKey(row) !== key
  );
  const customLocations = [...(normalized.customLocations ?? []), loc];

  return { ...normalized, customLocations, excludedCustomLocations };
}

export function updateZoneLocationRadius(
  rules: ZoneGeoRules,
  key: string,
  mode: "include" | "exclude",
  radiusKm: number
): ZoneGeoRules {
  const normalized = normalizeZoneGeoRules(rules);
  const radius = coerceRadius(radiusKm);
  if (mode === "include") {
    return {
      ...normalized,
      customLocations: (normalized.customLocations ?? []).map((row) =>
        zoneLocationKey(row) === key ? { ...row, radius } : row
      )
    };
  }
  return {
    ...normalized,
    excludedCustomLocations: (normalized.excludedCustomLocations ?? []).map((row) =>
      zoneLocationKey(row) === key ? { ...row, radius } : row
    )
  };
}

export function addZoneLocation(
  rules: ZoneGeoRules,
  loc: Partial<ZoneCustomLocation> & { latitude: number; longitude: number },
  mode: "include" | "exclude"
): ZoneGeoRules {
  const normalized = normalizeZoneGeoRules(rules);
  const entry = normalizeZoneCustomLocation({
    ...loc,
    radius: loc.radius ?? 3,
    distanceUnit: loc.distanceUnit ?? "kilometer"
  });
  if (!entry) return normalized;

  const key = zoneLocationKey(entry);
  const customLocations = (normalized.customLocations ?? []).filter((row) => zoneLocationKey(row) !== key);
  const excludedCustomLocations = (normalized.excludedCustomLocations ?? []).filter(
    (row) => zoneLocationKey(row) !== key
  );

  if (mode === "include") {
    return { ...normalized, customLocations: [...customLocations, entry], excludedCustomLocations };
  }
  return { ...normalized, customLocations, excludedCustomLocations: [...excludedCustomLocations, entry] };
}

export function removeZoneLocation(
  rules: ZoneGeoRules,
  key: string,
  mode: "include" | "exclude"
): ZoneGeoRules {
  const normalized = normalizeZoneGeoRules(rules);
  if (mode === "include") {
    return {
      ...normalized,
      customLocations: (normalized.customLocations ?? []).filter((row) => zoneLocationKey(row) !== key)
    };
  }
  return {
    ...normalized,
    excludedCustomLocations: (normalized.excludedCustomLocations ?? []).filter(
      (row) => zoneLocationKey(row) !== key
    )
  };
}
