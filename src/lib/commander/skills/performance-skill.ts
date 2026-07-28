import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";

import type { ScientistSkill, ScientistSkillResult } from "./types";

/**
 * Performance Scientist (id `performance`) — analisa as métricas REAIS das campanhas
 * do cliente (spend/CTR/CPA/ROAS recentes) e recomenda ações concretas de otimização.
 * Só IA sobre dados já coletados (sem fonte externa) — como o Testing Scientist.
 */
const PerformanceSchema = z.object({
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10),
  findings: z
    .array(
      z.object({
        type: z.enum(["winner", "underperformer", "action", "risk"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(600)
      })
    )
    .min(1)
    .max(8)
});

function metricsDigest(metrics: NonNullable<import("./types").ScientistSkillInput["campaignMetrics"]>): string {
  return metrics
    .map(
      (m) =>
        `- ${m.campaignName}: gasto R$${m.spend.toFixed(0)}, ${m.conversions} conversões, ` +
        `CTR ${m.ctr.toFixed(2)}%, CPA R$${m.cpa.toFixed(2)}, ROAS ${m.roas.toFixed(2)}x`
    )
    .join("\n");
}

export const performanceSkill: ScientistSkill = {
  id: "performance",
  flagId: "commander.scientists.performance",
  canRun: (input) => Boolean(input.campaignMetrics && input.campaignMetrics.length > 0),
  run: async (input): Promise<ScientistSkillResult> => {
    const metrics = input.campaignMetrics ?? [];
    if (!metrics.length) {
      return { scientistId: "performance", ran: false, reason: "no_metrics", findings: [], sources: [] };
    }

    const prompt = [
      "Você é analista de performance de tráfego pago (Meta Ads). Analise métricas REAIS de",
      "campanhas recentes e recomende ações concretas de otimização. Responda só com JSON.",
      "",
      "Campanhas (janela recente):",
      metricsDigest(metrics),
      "",
      "Tarefa: `confidence` (0-100, maior quanto mais dado/consistência houver), `summary`",
      "(2-3 frases) e `findings` (até 8) com type ∈ winner (campanha com melhor eficiência —",
      "escalar) | underperformer (campanha ineficiente — pausar/ajustar) | action (ação concreta",
      "recomendada: orçamento, criativo, público) | risk (alerta: CPA subindo, ROAS caindo, etc.).",
      "Use os números reais fornecidos; não invente métricas que não estão na lista."
    ].join("\n");

    try {
      const res = await aiGenerateJson({
        task: { kind: "analysis", complexity: "medium", label: "scientist.performance" },
        prompt,
        schema: PerformanceSchema
      });
      return {
        scientistId: "performance",
        ran: true,
        itemsAnalyzed: metrics.length,
        findings: res.data.findings.map((f) => ({ type: f.type, title: f.title, body: f.body })),
        summary: res.data.summary,
        confidence: res.data.confidence,
        sources: ["campaign_metrics"]
      };
    } catch (e) {
      return {
        scientistId: "performance",
        ran: false,
        reason: e instanceof Error ? e.message : "ai_unavailable",
        findings: [],
        sources: []
      };
    }
  }
};
