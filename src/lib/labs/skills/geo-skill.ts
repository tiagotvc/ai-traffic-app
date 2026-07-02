import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";
import { findMunicipio } from "@/lib/geo/ibge";
import { isGoogleMapsConfigured, reverseGeocodeCity, searchPlaces } from "@/lib/geo/google-maps";

import type { ScientistSkill, ScientistSkillFinding, ScientistSkillResult } from "./types";

function normCity(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Distância em km entre dois pontos (Haversine). */
function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Sobreposição de raio entre pins (público duplicado / verba desperdiçada). */
function overlapFindings(
  locs: NonNullable<import("./types").ScientistSkillInput["geoLocations"]>
): ScientistSkillFinding[] {
  const out: ScientistSkillFinding[] = [];
  for (let i = 0; i < locs.length; i++) {
    for (let j = i + 1; j < locs.length; j++) {
      const a = locs[i]!;
      const b = locs[j]!;
      const d = haversineKm(a, b);
      // Sobreposição relevante quando a distância < 60% da soma dos raios.
      if (d < (a.radius + b.radius) * 0.6) {
        out.push({
          type: "misfit",
          title: `Sobreposição: ${a.label ?? "pin"} × ${b.label ?? "pin"}`,
          body: `Ficam a ${d.toFixed(1)} km (raios ${a.radius}+${b.radius} km) — o público se sobrepõe. Reduza o raio ou remova um pin para evitar verba duplicada.`,
          evidence: { distanceKm: Math.round(d * 10) / 10, radiusA: a.radius, radiusB: b.radius }
        });
      }
    }
  }
  return out.slice(0, 3);
}

/** Pin isolado: muito mais longe dos demais que a mediana (possível erro/zona dispersa). */
function spreadFindings(
  locs: NonNullable<import("./types").ScientistSkillInput["geoLocations"]>
): ScientistSkillFinding[] {
  if (locs.length < 3) return [];
  const nn = locs.map((a, i) =>
    Math.min(...locs.filter((_, j) => j !== i).map((b) => haversineKm(a, b)))
  );
  const median = [...nn].sort((x, y) => x - y)[Math.floor(nn.length / 2)] ?? 0;
  const out: ScientistSkillFinding[] = [];
  locs.forEach((a, i) => {
    if (median > 0 && nn[i]! > median * 3) {
      out.push({
        type: "misfit",
        title: `Pin isolado: ${a.label ?? "pin"}`,
        body: `Está a ${nn[i]!.toFixed(1)} km do pin mais próximo (mediana ${median.toFixed(1)} km) — confira se realmente pertence a esta zona.`,
        evidence: { nearestKm: Math.round(nn[i]! * 10) / 10, medianKm: Math.round(median * 10) / 10 }
      });
    }
  });
  return out.slice(0, 2);
}

/**
 * Geo Scientist (id `geo`) — valida se os lugares (bairros/cidades) fazem sentido
 * para o briefing geográfico da zona, aponta os que não encaixam e sugere
 * faltantes. Usa conhecimento geográfico da IA (cientista "lógico", sem fonte
 * externa). Read-only.
 */
const GeoSchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10),
  findings: z
    .array(
      z.object({
        type: z.enum(["fit", "misfit", "suggestion", "insight"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(500)
      })
    )
    .min(1)
    .max(8)
});

export const geoSkill: ScientistSkill = {
  id: "geo",
  flagId: "campaigns.commander.scientists.geo",
  canRun: (input) =>
    Boolean(
      (input.places && input.places.length) ||
        input.briefing?.trim() ||
        (input.geoLocations && input.geoLocations.length >= 2)
    ),
  run: async (input): Promise<ScientistSkillResult> => {
    const places = (input.places ?? []).slice(0, 30);
    const geoLocs = input.geoLocations ?? [];
    const overlaps = geoLocs.length >= 2 ? overlapFindings(geoLocs) : [];
    const spread = geoLocs.length >= 3 ? spreadFindings(geoLocs) : [];

    let aiFindings: ScientistSkillFinding[] = [];
    let summary: string | undefined;
    let confidence: number | undefined;
    try {
      const prompt = [
        "Você é um analista geográfico de tráfego pago. Valide se os lugares sugeridos fazem sentido",
        "para o briefing de uma ZONA (segmentação geográfica). Responda só com JSON.",
        `Briefing: ${input.briefing?.slice(0, 500) ?? "(sem briefing)"}`,
        input.region ? `Região/cidade: ${input.region}` : "",
        "",
        "Lugares sugeridos:",
        places.length ? places.map((p) => `- ${p}`).join("\n") : "(nenhum)",
        "",
        "Tarefa: `confidence` (0-100), `summary` (2-3 frases) e `findings` (até 6) com type ∈",
        "fit (lugar que encaixa bem no critério) | misfit (lugar que NÃO bate com o briefing —",
        "ex.: bairro nobre quando o critério é 'baixa renda', ou bairro que não existe na cidade) |",
        "suggestion (lugar relevante que faltou) | insight (observação útil sobre a região).",
        "Avalie a COERÊNCIA SOCIOECONÔMICA: se o briefing pede um perfil de renda (baixa/média/alta),",
        "marque como misfit os bairros cujo perfil típico não bate. Seja específico e use o nome dos",
        "lugares. Não invente dados que não sabe (se incerto sobre a renda de um bairro, não afirme)."
      ]
        .filter(Boolean)
        .join("\n");

      const res = await aiGenerateJson({
        task: { kind: "analysis", complexity: "medium", label: "scientist.geo" },
        prompt,
        schema: GeoSchema
      });
      aiFindings = res.data.findings.map((f) => ({ type: f.type, title: f.title, body: f.body }));
      summary = res.data.summary;
      confidence = res.data.confidence;
    } catch {
      // Sem IA: ainda entregamos a análise geométrica (sobreposição).
    }

    // Enriquecimento por fontes externas (IBGE grátis; Google gated por key).
    const enrichment: ScientistSkillFinding[] = [];
    const extraSources: string[] = [];

    // IBGE — valida o município (UF/região).
    if (input.region) {
      const muni = await findMunicipio(input.region).catch(() => null);
      if (muni) {
        enrichment.push({
          type: "insight",
          title: `Cidade confirmada (IBGE): ${muni.nome}/${muni.uf}`,
          body: `Região ${muni.regiao}. Município validado na base do IBGE.`,
          evidence: { ibgeId: muni.id, uf: muni.uf }
        });
      } else {
        enrichment.push({
          type: "misfit",
          title: "Cidade não encontrada no IBGE",
          body: `"${input.region}" não bateu com nenhum município — confira a grafia.`
        });
      }
      extraSources.push("ibge");
    }

    // Google — cross-check de cidade por pin + POIs (só se a key estiver configurada).
    if (isGoogleMapsConfigured() && geoLocs.length) {
      const targetCity = normCity(input.region?.split(/[-,/]/)[0] ?? "");
      const pins = geoLocs.slice(0, 12);
      const resolved = await Promise.all(
        pins.map(async (p) => ({
          p,
          city: await reverseGeocodeCity(p.latitude, p.longitude).catch(() => null)
        }))
      );
      const outside = resolved.filter((r) => r.city && targetCity && normCity(r.city) !== targetCity);
      if (outside.length) {
        enrichment.push({
          type: "misfit",
          title: `${outside.length} pin(s) fora de ${input.region}`,
          body: `Ex.: ${outside[0]!.p.label ?? "pin"} → ${outside[0]!.city}. Confira se pertence a esta zona.`,
          evidence: { outside: outside.length }
        });
      }
      extraSources.push("google_geocoding");

      if (input.briefing) {
        const cLat = pins.reduce((s, p) => s + p.latitude, 0) / pins.length;
        const cLng = pins.reduce((s, p) => s + p.longitude, 0) / pins.length;
        const avgR = pins.reduce((s, p) => s + p.radius, 0) / pins.length;
        const pois = await searchPlaces(input.briefing.slice(0, 60), cLat, cLng, avgR).catch(() => []);
        if (pois.length) {
          enrichment.push({
            type: "insight",
            title: `POIs relevantes (${pois.length})`,
            body: pois.slice(0, 5).map((p) => p.name).join(", ")
          });
          extraSources.push("google_places");
        }
      }
    }

    const geometry = [...overlaps, ...spread];
    const findings = [...aiFindings, ...geometry, ...enrichment];
    if (!findings.length) {
      return { scientistId: "geo", ran: false, reason: "no_findings", findings: [], sources: [] };
    }

    return {
      scientistId: "geo",
      ran: true,
      itemsAnalyzed: places.length || geoLocs.length,
      findings: findings.slice(0, 10),
      summary,
      confidence,
      sources: [
        ...(aiFindings.length ? ["ai_geo"] : []),
        ...(geometry.length ? ["geometry"] : []),
        ...extraSources
      ]
    };
  }
};
