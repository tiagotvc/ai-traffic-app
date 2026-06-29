import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";
import { loadClientSignals } from "@/lib/agency-brain/client-signals";

/**
 * Performance Scientist — fecha o loop: lê a performance REAL (sinais do Brain,
 * que já rodam no sync) e gera um readout executivo por IA: o que escalar, pausar,
 * trocar (criativo) ou ajustar (público), com confiança. Read-only — NÃO altera
 * hipóteses/learnings (o pipeline do Brain e a confirmação manual seguem donos disso).
 */
export type PerformanceReadout = {
  ran: boolean;
  reason?: string;
  summary?: string;
  confidence?: number;
  windowDays?: number;
  totalSpend?: number;
  items: { action: PerformanceAction; title: string; body: string; confidence: number }[];
};

type PerformanceAction = "scale" | "pause" | "swap_creative" | "adjust_audience" | "keep";

const ReadoutSchema = z.object({
  summary: z.string().min(10),
  confidence: z.number().min(0).max(100),
  items: z
    .array(
      z.object({
        action: z.enum(["scale", "pause", "swap_creative", "adjust_audience", "keep"]),
        title: z.string().min(2).max(160),
        body: z.string().min(4).max(500),
        confidence: z.number().min(0).max(100)
      })
    )
    .min(1)
    .max(8)
});

export async function runPerformanceReadout(
  tenantId: string,
  clientId: string
): Promise<PerformanceReadout> {
  const ctx = await loadClientSignals(tenantId, clientId).catch(() => null);
  if (!ctx || !ctx.signals.length) {
    return { ran: false, reason: "no_signals", items: [] };
  }

  const top = [...ctx.signals]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 12)
    .map((s) => {
      const c = s.campaign;
      return `- [${s.type}/${s.tier}] ${c.campaignName ?? "campanha"}: Δ${Math.round(s.deltaPercent)}% vs baseline | CPA ${c.cpa ?? "—"} | ROAS ${c.roas ?? "—"} | gasto ${c.spend ?? 0} | confiança ${s.confidenceScore}`;
    })
    .join("\n");

  const prompt = [
    "Você é analista de performance de tráfego pago. Com base em sinais REAIS das campanhas",
    "(janela recente vs baseline), diga ao gestor o que fazer AGORA. Responda só com JSON.",
    `Janela: ${ctx.windowDays} dias. Gasto total: ${Math.round(ctx.totalSpend)}.`,
    "",
    "Sinais (maior prioridade primeiro):",
    top,
    "",
    "Tarefa: `summary` (2-3 frases), `confidence` (0-100) e `items` (até 6), cada um com",
    "`action` ∈ scale (escalar vencedor) | pause (pausar perdedor) | swap_creative (trocar criativo",
    "fadigado) | adjust_audience (ajustar público) | keep (manter), `title`, `body` (justificativa com",
    "números do sinal) e `confidence`. Baseie-se nos sinais; não invente campanhas que não estão na lista."
  ].join("\n");

  try {
    const res = await aiGenerateJson({
      task: { kind: "analysis", complexity: "medium", label: "scientist.performance" },
      prompt,
      schema: ReadoutSchema
    });
    return {
      ran: true,
      summary: res.data.summary,
      confidence: res.data.confidence,
      windowDays: ctx.windowDays,
      totalSpend: Math.round(ctx.totalSpend),
      items: res.data.items
    };
  } catch (e) {
    return { ran: false, reason: e instanceof Error ? e.message : "ai_unavailable", items: [] };
  }
}
