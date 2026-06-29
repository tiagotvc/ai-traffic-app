import "server-only";

/**
 * Google Maps (Geocoding + Places). Gated por GOOGLE_MAPS_API_KEY — sem a key,
 * tudo vira no-op (retorna null/[]), igual ao padrão do searchapi. Pronto para
 * ativar assim que a key for colocada no .env.
 */
const KEY = process.env.GOOGLE_MAPS_API_KEY;

export function isGoogleMapsConfigured(): boolean {
  return Boolean(KEY);
}

type GeocodeComponent = { long_name: string; short_name: string; types: string[] };

/** Reverse geocode (lat/lng → cidade). Para o cross-check de "pin fora da cidade". */
export async function reverseGeocodeCity(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${KEY}&language=pt-BR`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = (await r.json()) as {
      status: string;
      results?: Array<{ address_components: GeocodeComponent[] }>;
    };
    if (data.status !== "OK" || !data.results?.length) return null;
    for (const res of data.results) {
      const city = res.address_components.find(
        (c) =>
          c.types.includes("administrative_area_level_2") || c.types.includes("locality")
      );
      if (city) return city.long_name;
    }
    return null;
  } catch {
    return null;
  }
}

export type GooglePoi = { name: string; category: string };

/** Places Text Search perto de um ponto. Para enriquecer com POIs por tipo de zona. */
export async function searchPlaces(
  query: string,
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<GooglePoi[]> {
  if (!KEY || !query.trim()) return [];
  try {
    const radius = Math.min(50000, Math.max(1000, Math.round(radiusKm * 1000)));
    const url =
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}` +
      `&location=${latitude},${longitude}&radius=${radius}&key=${KEY}&language=pt-BR`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = (await r.json()) as {
      status: string;
      results?: Array<{ name: string; types?: string[] }>;
    };
    if (data.status !== "OK" || !data.results?.length) return [];
    return data.results.slice(0, 8).map((p) => ({
      name: p.name,
      category: p.types?.[0] ?? "place"
    }));
  } catch {
    return [];
  }
}
