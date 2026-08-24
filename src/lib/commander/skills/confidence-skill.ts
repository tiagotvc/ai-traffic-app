import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";

import type { ScientistSkill, ScientistSkillResult } from "./types";

/**
 * Confidence Scientist (id `confidence`) — meta-avaliação: cruza os achados dos
 * outros cientistas e aponta onde a evidência é forte/consistente e onde é fraca,
 * contraditória ou insuficiente. Não gera achado de mercado novo, só QUALIFICA os
 * já coletados (evita agir sobre um achado isolado e pouco sustentado).
 */
const ConfidenceSchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10),
  findings: z
    .array(
      z.object({
        type: z.enum(["strong", "weak", "contradiction", "gap"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(600)
      })
    )
    .min(1)
    .max(8)
});

export const confidenceSkill: ScientistSkill = {
  id: "confidence",
  flagId: "commander.scientists.confidence",
  canRun: (input) => Boolean(input.priorFindings?.some((p) => p.findings.length)),
  run: async (input): Promise<ScientistSkillResult> => {
    const prior = (input.priorFindings ?? [])
      .filter((p) => p.findings.length)
      .map(
        (p) =>
          `### ${p.label}\n` + p.findings.slice(0, 6).map((f) => `- [${f.type}] ${f.title}: ${f.body}`).join("\n")
      )
      .join("\n\n");

    if (!prior) {
      return { scientistId: "confidence", ran: false, reason: "no_prior_findings", findings: [], sources: [] };
    }

    const prompt = [
      "Você é um auditor cético de pesquisa de mercado. NÃO gere achado novo — avalie a",
      "QUALIDADE e CONSISTÊNCIA dos achados já coletados por outros cientistas. Responda só com JSON.",
      "",
      "Achados coletados (de todos os cientistas que rodaram):",
      prior,
      "",
      "Tarefa: `confidence` (0-100 — confiança GERAL no conjunto de achados, considerando volume",
      "de evidência e consistência entre fontes), `summary` (2-3 frases) e `findings` (até 6) com",
      "type ∈ strong (achado bem sustentado por evidência concreta — pode embasar decisão) |",
      "weak (achado com pouca evidência — tratar com cautela) | contradiction (dois achados que se",
      "contradizem entre cientistas diferentes) | gap (pergunta relevante que nenhum cientista",
      "respondeu). Seja específico: cite qual achado de qual cientista está sendo avaliado."
    ].join("\n");

    try {
      const res = await aiGenerateJson({
        task: { kind: "reasoning", complexity: "medium", label: "scientist.confidence" },
        prompt,
        schema: ConfidenceSchema
      });
      return {
        scientistId: "confidence",
        ran: true,
        itemsAnalyzed: input.priorFindings?.reduce((n, p) => n + p.findings.length, 0) ?? 0,
        findings: res.data.findings.map((f) => ({ type: f.type, title: f.title, body: f.body })),
        summary: res.data.summary,
        confidence: res.data.confidence,
        sources: ["synthesis"]
      };
    } catch (e) {
      return {
        scientistId: "confidence",
        ran: false,
        reason: e instanceof Error ? e.message : "ai_unavailable",
        findings: [],
        sources: []
      };
    }
  }
};
