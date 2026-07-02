import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { extractMarketPatterns } from "@/lib/agency-brain/market-pattern-extractor";
import { isMetaAdLibraryConfigured } from "@/lib/meta-ad-library/provider";
import { resolveSearchTerms } from "@/lib/meta-ad-library/search-keywords";
import type { NormalizedAd } from "@/lib/meta-ad-library/types";

import { fetchAdLibraryCached } from "../cached-ad-library";
import {
  canSpendSearchApi,
  getCachedResearch,
  recordSearchApiSpend,
  researchCacheKey,
  setCachedResearch
} from "../market-research-cache";
import {
  googleMapsFindings,
  googleSerpFindings,
  googleTrendsFindings,
  youtubeFindings
} from "../searchapi-sources";
import type { ScientistSkill, ScientistSkillFinding, ScientistSkillResult } from "./types";

/** Fontes extras (gated por sub-flag). Cada uma = 1 chamada searchapi no cache-miss. */
async function gatherExtraSources(
  niche: string,
  country: string
): Promise<{ findings: ScientistSkillFinding[]; sources: string[] }> {
  const sources: Array<[string, string, () => Promise<ScientistSkillFinding[]>]> = [
    ["campaigns.commander.scientists.competitor.google", "google_serp", () => googleSerpFindings(niche, country)],
    ["campaigns.commander.scientists.competitor.trends", "google_trends", () => googleTrendsFindings(niche, country)],
    ["campaigns.commander.scientists.competitor.youtube", "youtube", () => youtubeFindings(niche, country)],
    ["campaigns.commander.scientists.competitor.maps", "google_maps", () => googleMapsFindings(niche, country)]
  ];
  const findings: ScientistSkillFinding[] = [];
  const used: string[] = [];
  for (const [flagId, name, fn] of sources) {
    if (!(await isPlatformFeatureEnabled(flagId))) continue;
    if (!(await canSpendSearchApi())) break; // teto mensal protege o limite do plano
    const f = await fn().catch(() => []);
    await recordSearchApiSpend();
    if (f.length) {
      findings.push(...f);
      used.push(name);
    }
  }
  return { findings, sources: used };
}

/** Anúncio rodando há >= N dias = "vencedor" (proxy de performance — Winner DNA). */
const WINNER_DAYS = 60;

const SynthSchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10),
  findings: z
    .array(
      z.object({
        type: z.enum(["hook", "offer", "angle", "creative_pattern", "saturation", "gap", "avoid"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(600)
      })
    )
    .min(1)
    .max(10)
});

function adDigest(ads: NormalizedAd[]): string {
  return ads
    .map(
      (a) =>
        `- [${a.daysRunning}d] ${a.pageName}: "${(a.headline || a.body).slice(0, 90)}" | CTA: ${a.cta ?? "—"} | ${a.format}`
    )
    .join("\n");
}

/** Saturação simples: formato/CTA dominante entre os anúncios coletados. */
function saturationFindings(ads: NormalizedAd[]): ScientistSkillFinding[] {
  if (ads.length < 5) return [];
  const out: ScientistSkillFinding[] = [];
  const byFormat = new Map<string, number>();
  for (const a of ads) byFormat.set(a.format, (byFormat.get(a.format) ?? 0) + 1);
  const [topFormat, topCount] = [...byFormat.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const pct = Math.round((topCount / ads.length) * 100);
  if (pct >= 60 && topFormat && topFormat !== "unknown") {
    out.push({
      type: "saturation",
      title: `Formato saturado: ${topFormat} (${pct}%)`,
      body: `${pct}% dos anúncios usam ${topFormat}. Considere um formato menos disputado para se destacar.`,
      evidence: { saturationPct: pct, format: topFormat }
    });
  }
  return out;
}

export const competitorSkill: ScientistSkill = {
  id: "competitor",
  flagId: "campaigns.commander.scientists.competitor",
  canRun: (input) => Boolean(input.niche?.trim() || (input.competitors && input.competitors.length)),
  run: async (input): Promise<ScientistSkillResult> => {
    if (!isMetaAdLibraryConfigured()) {
      return {
        scientistId: "competitor",
        ran: false,
        reason: "ad_library_not_configured",
        findings: [],
        sources: []
      };
    }

    // 1) DADOS PRIMEIRO: cache por nicho+país (compartilhado entre todos os usuários).
    //    Cache hit = 0 chamadas ao searchapi e 0 custo de IA (a síntese vem cacheada).
    const cacheKey = researchCacheKey("competitor", input.niche, input.marketCountry);
    const cached = await getCachedResearch<ScientistSkillResult>(cacheKey);
    if (cached) {
      return { ...cached, scientistId: "competitor", ran: true };
    }

    // 2) Fetch bruto com cache compartilhado por nicho + teto mensal (vale p/ qualquer tela).
    const searchTerms = resolveSearchTerms(input.niche).slice(0, 4);
    const result = await fetchAdLibraryCached({
      competitors: input.competitors ?? [],
      searchTerms,
      marketCountry: input.marketCountry ?? "BR",
      maxAdsPerQuery: 25,
      cacheNiche: input.niche ?? ""
    });
    if (result.budgetExhausted) {
      return {
        scientistId: "competitor",
        ran: false,
        reason: "searchapi_budget_exhausted",
        findings: [],
        sources: []
      };
    }

    const ads = result.ads;
    if (!ads.length) {
      return {
        scientistId: "competitor",
        ran: false,
        reason: result.apiError ?? "no_ads_found",
        findings: [],
        sources: ["meta_ad_library"]
      };
    }

    // Winner DNA — anúncios mais longevos primeiro (proxy de performance).
    const ranked = [...ads].sort((a, b) => b.daysRunning - a.daysRunning);
    const winners = ranked.filter((a) => a.daysRunning >= WINNER_DAYS);
    const topForSynthesis = (winners.length ? winners : ranked).slice(0, 15);

    // Síntese por IA (router) sobre os vencedores; fallback para regras.
    let aiFindings: ScientistSkillFinding[] = [];
    let summary: string | undefined;
    let confidence: number | undefined;
    try {
      const prompt = [
        "Você é analista de inteligência competitiva de tráfego pago. Analise anúncios reais de",
        "concorrentes (Meta Ad Library) e extraia inteligência acionável. Responda só com JSON.",
        `Nicho: ${input.niche ?? "(geral)"}. País: ${input.marketCountry ?? "BR"}.`,
        `Anúncios analisados: ${ads.length} (vencedores ≥${WINNER_DAYS} dias: ${winners.length}).`,
        "",
        "Anúncios (dias no ar primeiro = mais provados):",
        adDigest(topForSynthesis),
        "",
        "Tarefa: `confidence` (0-100, maior se há mais anúncios e mais vencedores),",
        "`summary` (2-3 frases) e `findings` (até 8) com type ∈ hook|offer|angle|creative_pattern|",
        "saturation|gap|avoid. Priorize padrões dos anúncios LONGEVOS. Aponte ângulos saturados",
        "(muitos usam) e gaps (poucos usam). Use números. Não invente o que não está nos dados."
      ].join("\n");

      const res = await aiGenerateJson({
        task: { kind: "analysis", complexity: "medium", label: "scientist.competitor" },
        prompt,
        schema: SynthSchema
      });
      aiFindings = res.data.findings.map((f) => ({ type: f.type, title: f.title, body: f.body }));
      summary = res.data.summary;
      confidence = res.data.confidence;
    } catch {
      // Fallback por regras (sem IA): padrões + saturação.
      const patterns = extractMarketPatterns(ads, input.niche ?? null);
      aiFindings = patterns.map((p) => ({
        type: "creative_pattern",
        title: p.title,
        body: p.body,
        evidence: p.evidence as Record<string, unknown> | undefined
      }));
    }

    const findings = [...aiFindings, ...saturationFindings(ads)];
    if (winners.length) {
      findings.unshift({
        type: "creative_pattern",
        title: `${winners.length} anúncios "vencedores" (≥${WINNER_DAYS} dias no ar)`,
        body: `Liderados por ${winners[0]!.pageName} (${winners[0]!.daysRunning} dias). Anúncios longevos = padrões provados — priorize-os.`,
        evidence: { winners: winners.length, topDays: winners[0]!.daysRunning }
      });
    }

    // 3b) Fontes extras (Google/Trends/YouTube/Maps) — gated por sub-flag + mesmo budget.
    const extra = await gatherExtraSources(input.niche ?? "", input.marketCountry ?? "BR");

    const finalResult: ScientistSkillResult = {
      scientistId: "competitor",
      ran: true,
      itemsAnalyzed: ads.length,
      findings: [...findings.slice(0, 8), ...extra.findings].slice(0, 12),
      summary,
      confidence,
      sources: ["meta_ad_library", ...extra.sources]
    };

    // 4) Cacheia o resultado (síntese + fontes extras) — próximos acessos ao nicho = grátis.
    await setCachedResearch(cacheKey, finalResult);
    return finalResult;
  }
};
