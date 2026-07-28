import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";

import {
  canSpendSearchApi,
  getCachedResearch,
  googleSerpFindings,
  recordSearchApiSpend,
  researchCacheKey,
  setCachedResearch
} from "../researcher";
import type { ScientistSkill, ScientistSkillResult } from "./types";

/**
 * Consumer Scientist (id `consumer`) — pesquisa comportamento e motivações do
 * público-alvo a partir de dúvidas/buscas reais (Google SERP: "as pessoas também
 * perguntam") e traduz em objeções, motivações de compra e linguagem do público.
 */
const ConsumerSchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10),
  findings: z
    .array(
      z.object({
        type: z.enum(["objection", "motivation", "language", "insight"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(600)
      })
    )
    .min(1)
    .max(8)
});

export const consumerSkill: ScientistSkill = {
  id: "consumer",
  flagId: "commander.scientists.consumer",
  canRun: (input) => Boolean(input.niche?.trim()),
  run: async (input): Promise<ScientistSkillResult> => {
    const niche = input.niche?.trim() ?? "";
    const country = input.marketCountry ?? "BR";

    const cacheKey = researchCacheKey("consumer", niche, country);
    const cached = await getCachedResearch<ScientistSkillResult>(cacheKey);
    if (cached) return { ...cached, scientistId: "consumer", ran: true };

    if (!(await canSpendSearchApi())) {
      return { scientistId: "consumer", ran: false, reason: "searchapi_budget_exhausted", findings: [], sources: [] };
    }
    const raw = await googleSerpFindings(niche, country).catch(() => []);
    await recordSearchApiSpend();
    if (!raw.length) {
      return { scientistId: "consumer", ran: false, reason: "no_consumer_data", findings: [], sources: [] };
    }

    let summary: string | undefined;
    let confidence: number | undefined;
    let findings = raw;
    try {
      const prompt = [
        "Você é pesquisador de comportamento do consumidor para tráfego pago. Interprete dúvidas",
        `e buscas reais do público no nicho "${niche}" (Google, ${country}) e traduza em`,
        "objeções, motivações de compra e a linguagem que o público usa. Responda só com JSON.",
        "",
        "Dados coletados:",
        raw.map((f) => `- ${f.title}: ${f.body}`).join("\n"),
        "",
        "Tarefa: `confidence` (0-100), `summary` (2-3 frases) e `findings` (até 6) com type ∈",
        "objection (objeção/dúvida que trava a compra) | motivation (o que motiva a decisão) |",
        "language (termos/expressões reais do público, úteis pra copy) | insight (observação útil",
        "sobre o comportamento). Baseie-se só nos dados coletados; não invente o que não está lá."
      ].join("\n");
      const res = await aiGenerateJson({
        task: { kind: "analysis", complexity: "medium", label: "scientist.consumer" },
        prompt,
        schema: ConsumerSchema
      });
      findings = res.data.findings.map((f) => ({ type: f.type, title: f.title, body: f.body }));
      summary = res.data.summary;
      confidence = res.data.confidence;
    } catch {
      // Sem IA: ainda entregamos as perguntas brutas coletadas.
    }

    const finalResult: ScientistSkillResult = {
      scientistId: "consumer",
      ran: true,
      itemsAnalyzed: raw.length,
      findings,
      summary,
      confidence,
      sources: ["google_serp"]
    };
    await setCachedResearch(cacheKey, finalResult);
    return finalResult;
  }
};
