import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";

import type { ScientistSkill, ScientistSkillResult } from "./types";

/**
 * Hypothesis Scientist (id `hypothesis`) — lê os achados consolidados dos outros
 * cientistas (marketing/geo/trend/consumer) e gera hipóteses TESTÁVEIS: variável a
 * mudar, resultado esperado e como validar. Diferente do Testing Scientist (que
 * simula parâmetros de teste), aqui o foco é formular a hipótese em si.
 */
const HypothesisSchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10),
  findings: z
    .array(
      z.object({
        type: z.enum(["hypothesis", "variable", "expected_outcome", "validation"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(600)
      })
    )
    .min(1)
    .max(8)
});

export const hypothesisSkill: ScientistSkill = {
  id: "hypothesis",
  flagId: "commander.scientists.hypothesis",
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
      return { scientistId: "hypothesis", ran: false, reason: "no_prior_findings", findings: [], sources: [] };
    }

    const prompt = [
      "Você é estrategista de growth. A partir dos achados já coletados por outros cientistas,",
      "formule HIPÓTESES testáveis (não simule o teste — isso é papel do Testing Scientist).",
      `Nicho: ${input.niche ?? "(geral)"}. Região: ${input.region ?? input.marketCountry ?? "BR"}.`,
      "",
      "Achados coletados:",
      prior,
      "",
      "Tarefa: `confidence` (0-100, maior quanto mais evidência sustenta a hipótese), `summary`",
      "(2-3 frases) e `findings` (até 6) com type ∈ hypothesis (afirmação testável: 'se X, então Y')",
      "| variable (o que exatamente muda entre as variantes) | expected_outcome (resultado esperado",
      "e por quê, com base na evidência) | validation (como confirmar: métrica e critério de sucesso).",
      "Cada hipótese deve vir da evidência coletada — não invente o que não está nos achados."
    ].join("\n");

    try {
      const res = await aiGenerateJson({
        task: { kind: "reasoning", complexity: "medium", label: "scientist.hypothesis" },
        prompt,
        schema: HypothesisSchema
      });
      return {
        scientistId: "hypothesis",
        ran: true,
        itemsAnalyzed: input.priorFindings?.reduce((n, p) => n + p.findings.length, 0) ?? 0,
        findings: res.data.findings.map((f) => ({ type: f.type, title: f.title, body: f.body })),
        summary: res.data.summary,
        confidence: res.data.confidence,
        sources: ["synthesis"]
      };
    } catch (e) {
      return {
        scientistId: "hypothesis",
        ran: false,
        reason: e instanceof Error ? e.message : "ai_unavailable",
        findings: [],
        sources: []
      };
    }
  }
};
