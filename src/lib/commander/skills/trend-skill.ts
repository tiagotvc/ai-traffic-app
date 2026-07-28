import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";

import {
  canSpendSearchApi,
  getCachedResearch,
  googleTrendsFindings,
  recordSearchApiSpend,
  researchCacheKey,
  setCachedResearch
} from "../researcher";
import type { ScientistSkill, ScientistSkillResult } from "./types";

/**
 * Trend Scientist (id `trend`) — detecta tendências e momentum de mercado no nicho
 * (Google Trends: buscas em alta) e explica a implicação prática pra timing de
 * campanha (entrar agora, aguardar, ou ângulo emergente pra explorar).
 */
const TrendSchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10),
  findings: z
    .array(
      z.object({
        type: z.enum(["angle", "insight", "gap"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(600)
      })
    )
    .min(1)
    .max(8)
});

export const trendSkill: ScientistSkill = {
  id: "trend",
  flagId: "commander.scientists.trend",
  canRun: (input) => Boolean(input.niche?.trim()),
  run: async (input): Promise<ScientistSkillResult> => {
    const niche = input.niche?.trim() ?? "";
    const country = input.marketCountry ?? "BR";

    const cacheKey = researchCacheKey("trend", niche, country);
    const cached = await getCachedResearch<ScientistSkillResult>(cacheKey);
    if (cached) return { ...cached, scientistId: "trend", ran: true };

    if (!(await canSpendSearchApi())) {
      return { scientistId: "trend", ran: false, reason: "searchapi_budget_exhausted", findings: [], sources: [] };
    }
    const raw = await googleTrendsFindings(niche, country).catch(() => []);
    await recordSearchApiSpend();
    if (!raw.length) {
      return { scientistId: "trend", ran: false, reason: "no_trend_data", findings: [], sources: [] };
    }

    let summary: string | undefined;
    let confidence: number | undefined;
    let findings = raw;
    try {
      const prompt = [
        "Você é analista de tendências de mercado para tráfego pago. Interprete buscas em alta",
        `no nicho "${niche}" (Google Trends, ${country}) e explique a implicação prática.`,
        "Responda só com JSON.",
        "",
        "Dados coletados:",
        raw.map((f) => `- ${f.title}: ${f.body}`).join("\n"),
        "",
        "Tarefa: `confidence` (0-100), `summary` (2-3 frases) e `findings` (até 6) com type ∈",
        "angle (ângulo/gancho emergente pra explorar agora) | insight (o que o momentum significa",
        "pro timing de campanha) | gap (tendência que os concorrentes ainda não exploram).",
        "Baseie-se só nos dados coletados; não invente números."
      ].join("\n");
      const res = await aiGenerateJson({
        task: { kind: "analysis", complexity: "medium", label: "scientist.trend" },
        prompt,
        schema: TrendSchema
      });
      findings = res.data.findings.map((f) => ({ type: f.type, title: f.title, body: f.body }));
      summary = res.data.summary;
      confidence = res.data.confidence;
    } catch {
      // Sem IA: ainda entregamos os dados brutos do Trends.
    }

    const finalResult: ScientistSkillResult = {
      scientistId: "trend",
      ran: true,
      itemsAnalyzed: raw.length,
      findings,
      summary,
      confidence,
      sources: ["google_trends"]
    };
    await setCachedResearch(cacheKey, finalResult);
    return finalResult;
  }
};
