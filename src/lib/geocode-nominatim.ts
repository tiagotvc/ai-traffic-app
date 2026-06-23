import "server-only";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

/** Geocode a free-text address via Nominatim (OSM). Use sparingly; respect usage policy. */
export async function geocodeAddressWithNominatim(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    addressdetails: "0"
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      "User-Agent": "TrafficAI/1.0 (campaign geo; contact: support@trafficai.com.br)"
    },
    next: { revalidate: 86400 }
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
}
