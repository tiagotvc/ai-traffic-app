import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";

import type { ScientistSkill, ScientistSkillResult } from "./types";

/**
 * Testing Scientist (id `testing`) — SIMULAÇÃO interna (não A/B na Meta). Consome os
 * dossiês dos outros cientistas (marketing/geo/trend) + nicho/região e prevê, ANTES
 * de gastar mídia: hipótese principal, o que testar primeiro (variações de
 * ângulo/oferta/público), vencedor provável, métrica e guardrail (critério de parada).
 * Só IA sobre dados já coletados → barato, zero searchapi. Read-only.
 */
const TestingSchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10),
  findings: z
    .array(
      z.object({
        type: z.enum(["hypothesis", "test", "prediction", "metric", "guardrail"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(600)
      })
    )
    .min(1)
    .max(8)
});

export const testingSkill: ScientistSkill = {
  id: "testing",
  flagId: "scientists.testing",
  canRun: (input) =>
    Boolean(input.priorFindings?.length || input.niche?.trim() || input.briefing?.trim()),
  run: async (input): Promise<ScientistSkillResult> => {
    const prior = (input.priorFindings ?? [])
      .map(
        (p) =>
          `### ${p.label}\n` +
          p.findings
            .slice(0, 6)
            .map((f) => `- [${f.type}] ${f.title}: ${f.body}`)
            .join("\n")
      )
      .join("\n\n");

    const prompt = [
      "Você é estrategista de experimentação (growth). Faça uma SIMULAÇÃO interna (NÃO um teste A/B real",
      "na Meta) ANTES de gastar mídia, com base na pesquisa de mercado já coletada. Responda só com JSON.",
      `Nicho: ${input.niche ?? "(geral)"}. Região: ${input.region ?? input.marketCountry ?? "BR"}.`,
      input.briefing ? `Briefing: ${input.briefing.slice(0, 400)}` : "",
      "",
      "Pesquisa coletada (concorrentes/geo/tendências):",
      prior || "(sem dossiê prévio — use o nicho/briefing)",
      "",
      "Tarefa: `confidence` (0-100, maior quanto mais evidência no dossiê), `summary` (2-3 frases) e",
      "`findings` (até 6) com type ∈ hypothesis (hipótese principal a validar) | test (o que testar",
      "primeiro: variações de ângulo/oferta/público) | prediction (qual variação tem mais chance e por quê)",
      "| metric (métrica principal de decisão) | guardrail (critério de parada: mín. de impressões/cliques/",
      "tempo antes de decidir). Baseie tudo na evidência coletada; não invente números que não existem."
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await aiGenerateJson({
        task: { kind: "analysis", complexity: "medium", label: "scientist.testing" },
        prompt,
        schema: TestingSchema
      });
      return {
        scientistId: "testing",
        ran: true,
        itemsAnalyzed: input.priorFindings?.reduce((n, p) => n + p.findings.length, 0) ?? 0,
        findings: res.data.findings.map((f) => ({ type: f.type, title: f.title, body: f.body })),
        summary: res.data.summary,
        confidence: res.data.confidence,
        sources: ["simulation"]
      };
    } catch (e) {
      return {
        scientistId: "testing",
        ran: false,
        reason: e instanceof Error ? e.message : "ai_unavailable",
        findings: [],
        sources: []
      };
    }
  }
};
