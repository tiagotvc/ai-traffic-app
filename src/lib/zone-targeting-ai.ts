import "server-only";

import { z } from "zod";

import type { ZoneGeoRules } from "@/db/entities/UserZone";
import { geocodeWithNominatim, geocodeWithPhoton } from "@/lib/geocode-nominatim";
import { llmGenerateJson } from "@/lib/llm/generate-json";
import type { LlmProviderId } from "@/lib/llm/types";

const ZonePlaceSchema = z.object({
  label: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  radiusKm: z.number().min(1).max(70).default(3)
});

const ZoneAiResponseSchema = z.object({
  zoneName: z.string().min(1),
  summary: z.string().min(1),
  places: z.array(ZonePlaceSchema).min(1).max(12)
});

export type ZoneAiPreview = z.infer<typeof ZoneAiResponseSchema> & {
  provider: LlmProviderId;
  modelUsed: string;
};

export type ZoneGeocodeResult = {
  name: string;
  summary: string;
  geoRules: ZoneGeoRules;
  places: Array<{
    label: string;
    latitude: number;
    longitude: number;
    radius: number;
    geocodeLabel: string;
  }>;
  provider: LlmProviderId;
  modelUsed: string;
};

function buildZonePrompt(prompt: string): string {
  return [
    "Você é especialista em geolocalização para anúncios Meta Ads no Brasil.",
    "MÓDULO ZONA — retorne APENAS regras geográficas estruturadas.",
    "PROIBIDO: idade, gênero, interesses, comportamentos, demographics ou IDs Meta.",
    "Converta a descrição do usuário em lugares concretos (bairros, regiões, cidades) com raio em km.",
    "",
    "Responda APENAS JSON:",
    "{",
    '  "zoneName": string,',
    '  "summary": string,',
    '  "places": [{ "label": string, "city"?: string, "state"?: string, "radiusKm": number }]',
    "}",
    "",
    "Descrição do usuário:",
    prompt.trim()
  ].join("\n");
}

async function geocodePlace(place: z.infer<typeof ZonePlaceSchema>) {
  const parts = [place.label, place.city, place.state, "Brasil"].filter(Boolean);
  const query = parts.join(", ");
  const photon = await geocodeWithPhoton(query);
  if (photon) return photon;
  return geocodeWithNominatim(query, { countrycodes: "br" });
}

export async function generateZoneAiPreview(args: {
  provider: LlmProviderId;
  prompt: string;
}): Promise<ZoneAiPreview> {
  const result = await llmGenerateJson({
    provider: args.provider,
    prompt: buildZonePrompt(args.prompt),
    schema: ZoneAiResponseSchema,
    temperature: 0.3
  });

  return {
    ...result.data,
    provider: args.provider,
    modelUsed: result.modelUsed
  };
}

export async function geocodeZonePreview(preview: ZoneAiPreview): Promise<ZoneGeocodeResult> {
  const customLocations: ZoneGeoRules["customLocations"] = [];
  const resolvedPlaces: ZoneGeocodeResult["places"] = [];

  for (const place of preview.places) {
    const hit = await geocodePlace(place);
    if (!hit) continue;
    const radius = place.radiusKm ?? 3;
    customLocations.push({
      latitude: hit.latitude,
      longitude: hit.longitude,
      radius,
      distanceUnit: "kilometer",
      label: place.label
    });
    resolvedPlaces.push({
      label: place.label,
      latitude: hit.latitude,
      longitude: hit.longitude,
      radius,
      geocodeLabel: hit.displayName
    });
  }

  if (!customLocations.length) {
    throw new Error(
      "Não foi possível geocodificar os lugares sugeridos. Tente nomes mais específicos (bairro + cidade)."
    );
  }

  return {
    name: preview.zoneName,
    summary: preview.summary,
    geoRules: { customLocations },
    places: resolvedPlaces,
    provider: preview.provider,
    modelUsed: preview.modelUsed
  };
}

export async function generateZoneFromPrompt(args: {
  provider: LlmProviderId;
  prompt: string;
}): Promise<ZoneGeocodeResult> {
  const preview = await generateZoneAiPreview(args);
  return geocodeZonePreview(preview);
}
