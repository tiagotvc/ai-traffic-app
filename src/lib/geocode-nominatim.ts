import "server-only";

import {
  extractBrazilCep,
  formatBrazilCep,
  parseBrazilianAddressInput,
  type ViaCepParts
} from "@/lib/address-brazil";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api/";
const VIACEP_URL = "https://viacep.com.br/ws";

const USER_AGENT = "TrafficAI/1.0 (campaign geo; contact: support@trafficai.com.br)";
const BR_BBOX = "-73.99,-33.75,-34.79,5.27";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

export type ResolvedCommercialAddress = {
  userInput: string;
  normalized: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeLabel: string | null;
  cep: string | null;
};

type ViaCepRow = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

async function fetchViaCep(cepDigits: string): Promise<ViaCepParts | null> {
  try {
    const res = await fetch(`${VIACEP_URL}/${cepDigits}/json/`, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store"
    });
    if (!res.ok) return null;
    const row = (await res.json()) as ViaCepRow;
    if (row.erro || !row.localidade) return null;
    return {
      cep: cepDigits,
      logradouro: row.logradouro?.trim() || "",
      bairro: row.bairro?.trim() || "",
      localidade: row.localidade.trim(),
      uf: row.uf?.trim().toUpperCase() || ""
    };
  } catch {
    return null;
  }
}

export async function geocodeWithPhoton(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({ q, limit: "1", lang: "pt", bbox: BR_BBOX });

  try {
    const res = await fetch(`${PHOTON_URL}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store"
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: {
          name?: string;
          street?: string;
          housenumber?: string;
          district?: string;
          city?: string;
          state?: string;
          country?: string;
        };
      }>;
    };

    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;

    const [lng, lat] = coords;
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const p = feature.properties ?? {};
    const label = [p.street ?? p.name, p.housenumber, p.district, p.city, p.state, p.country]
      .filter(Boolean)
      .join(", ");

    return { latitude: lat, longitude: lng, displayName: label || q };
  } catch {
    return null;
  }
}

export async function geocodeWithNominatim(
  query: string,
  opts?: { countrycodes?: string }
): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    addressdetails: "0"
  });
  if (opts?.countrycodes) params.set("countrycodes", opts.countrycodes);

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store"
    });
    if (!res.ok) return null;

    const rows = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const hit = rows[0];
    if (!hit?.lat || !hit.lon) return null;

    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return {
      latitude,
      longitude,
      displayName: hit.display_name ?? q
    };
  } catch {
    return null;
  }
}

async function geocodeFromQueries(queries: string[]): Promise<GeocodeResult | null> {
  for (const q of queries) {
    const photon = await geocodeWithPhoton(q);
    if (photon) return photon;
    const nominatim = await geocodeWithNominatim(q, { countrycodes: "br" });
    if (nominatim) return nominatim;
  }
  return null;
}

/** Normalize user input and resolve coordinates (BR-first). */
export async function resolveCommercialAddress(raw: string): Promise<ResolvedCommercialAddress> {
  const userInput = raw.trim();
  if (!userInput) {
    return {
      userInput: "",
      normalized: null,
      latitude: null,
      longitude: null,
      geocodeLabel: null,
      cep: null
    };
  }

  const cepDigits = extractBrazilCep(userInput);
  const via = cepDigits ? await fetchViaCep(cepDigits) : null;
  const parsed = parseBrazilianAddressInput(userInput, via);
  const hit = await geocodeFromQueries(parsed.geocodeQueries);

  return {
    userInput,
    normalized: parsed.normalized || null,
    latitude: hit?.latitude ?? null,
    longitude: hit?.longitude ?? null,
    geocodeLabel: hit?.displayName ?? null,
    cep: parsed.cepFormatted ?? (cepDigits ? formatBrazilCep(cepDigits) : null)
  };
}

/** @deprecated use resolveCommercialAddress */
export async function geocodeAddressWithNominatim(query: string): Promise<GeocodeResult | null> {
  const resolved = await resolveCommercialAddress(query);
  if (resolved.latitude == null || resolved.longitude == null) return null;
  return {
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    displayName: resolved.geocodeLabel ?? resolved.normalized ?? query
  };
}
