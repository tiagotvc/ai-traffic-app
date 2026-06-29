import "server-only";

import type { ScientistSkillFinding } from "./skills/types";

/**
 * Fontes extras do Marketing Scientist via searchapi (engines REST confirmados):
 * google (SERP + perguntas), google_trends, youtube, google_maps. Cada uma vira
 * findings prontos (sem custo extra de IA). Gated por SEARCHAPI_API_KEY.
 */
const KEY = process.env.SEARCHAPI_API_KEY?.trim();
const BASE = "https://www.searchapi.io/api/v1/search";

async function call(params: Record<string, string>): Promise<Record<string, unknown> | null> {
  if (!KEY) return null;
  try {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${BASE}?${qs}`, {
      headers: { Authorization: `Bearer ${KEY}` },
      cache: "no-store"
    });
    if (!r.ok) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Google SERP — perguntas reais do público (dores/objeções) + buscas relacionadas. */
export async function googleSerpFindings(niche: string, country: string): Promise<ScientistSkillFinding[]> {
  const j = await call({ engine: "google", q: niche, gl: country.toLowerCase(), hl: "pt-br" });
  if (!j) return [];
  const out: ScientistSkillFinding[] = [];
  const questions = ((j.related_questions as Array<{ question?: string }>) ?? [])
    .map((x) => x.question)
    .filter((q): q is string => Boolean(q))
    .slice(0, 5);
  if (questions.length) {
    out.push({
      type: "angle",
      title: `Dúvidas reais do público (Google · ${questions.length})`,
      body: questions.join(" · "),
      evidence: { source: "google_serp" }
    });
  }
  return out;
}

/** Google Trends — buscas em alta (ângulos emergentes). */
export async function googleTrendsFindings(niche: string, country: string): Promise<ScientistSkillFinding[]> {
  const j = await call({ engine: "google_trends", q: niche, data_type: "RELATED_QUERIES", geo: country.toUpperCase() });
  const rising = ((j?.related_queries as { rising?: Array<{ query?: string; values?: string }> })?.rising) ?? [];
  const top = rising
    .map((x) => (x.query ? `${x.query}${x.values ? ` (${x.values})` : ""}` : null))
    .filter((s): s is string => Boolean(s))
    .slice(0, 5);
  if (!top.length) return [];
  return [
    {
      type: "angle",
      title: `Buscas em alta no nicho (Trends · ${top.length})`,
      body: top.join(" · "),
      evidence: { source: "google_trends" }
    }
  ];
}

/** YouTube — concorrentes em vídeo. */
export async function youtubeFindings(niche: string, country: string): Promise<ScientistSkillFinding[]> {
  const j = await call({ engine: "youtube", q: niche, gl: country.toLowerCase(), hl: "pt" });
  const vids = ((j?.videos as Array<{ title?: string; channel?: { title?: string }; views?: number }>) ?? []).slice(0, 4);
  if (!vids.length) return [];
  const list = vids.map(
    (v) => `${v.channel?.title ?? "?"} — "${(v.title ?? "").slice(0, 50)}" (${v.views ?? 0} views)`
  );
  return [
    {
      type: "creative_pattern",
      title: "Concorrentes em vídeo (YouTube)",
      body: list.join(" · "),
      evidence: { source: "youtube" }
    }
  ];
}

/** Google Maps — players locais + reputação (★/reviews). */
export async function googleMapsFindings(niche: string, region: string | null): Promise<ScientistSkillFinding[]> {
  const q = region ? `${niche} ${region}` : niche;
  const j = await call({ engine: "google_maps", q });
  const locals = ((j?.local_results as Array<{ title?: string; rating?: number; reviews?: number }>) ?? [])
    .filter((l) => l.rating)
    .slice(0, 5);
  if (!locals.length) return [];
  const list = locals.map((l) => `${l.title} (${l.rating}★, ${l.reviews ?? 0} avaliações)`);
  return [
    {
      type: "insight",
      title: "Players locais + reputação (Maps)",
      body: list.join(" · "),
      evidence: { source: "google_maps" }
    }
  ];
}
