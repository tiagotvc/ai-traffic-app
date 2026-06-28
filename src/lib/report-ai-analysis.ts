import "server-only";

import { z } from "zod";

import type { MetricKey } from "@/lib/dashboard-metrics";
import { aiGenerateJson } from "@/lib/ai/generate";
import type { ReportRecommendation } from "@/lib/report-narrative";
import type { CampaignSpendRow, ReportSummary } from "@/lib/report-preview-types";

const ClaudeReportSchema = z.object({
  executiveSummary: z.string().min(40),
  keyFindings: z.array(z.string().min(8)).min(2).max(5),
  recommendations: z
    .array(
      z.object({
        title: z.string().min(3),
        body: z.string().min(20),
        priority: z.enum(["high", "medium", "low"])
      })
    )
    .min(1)
    .max(5)
});

export type ReportAiAnalysis = {
  provider: string;
  executiveSummary: string;
  keyFindings: string[];
  recommendations: ReportRecommendation[];
};

function formatMetricBlock(
  summary: ReportSummary,
  previous: ReportSummary | null,
  goalMetric: MetricKey,
  goalLabel: string
): string {
  const lines = [
    `Investimento: R$ ${(summary.spend ?? 0).toFixed(2)}`,
    `${goalLabel}: ${Math.round(summary[goalMetric] ?? 0)}`,
    `CTR: ${(summary.ctr ?? 0).toFixed(2)}%`,
    `CPM: R$ ${(summary.cpm ?? 0).toFixed(2)}`,
    `Conversões: ${Math.round(summary.conversions ?? 0)}`
  ];
  if (previous) {
    lines.push(
      `Período anterior — investimento: R$ ${(previous.spend ?? 0).toFixed(2)}, ${goalLabel}: ${Math.round(previous[goalMetric] ?? 0)}`
    );
  }
  return lines.join("\n");
}

export async function generateReportClaudeAnalysis(input: {
  locale: string;
  clientName: string;
  accountLabel?: string;
  periodLabel: string;
  prevPeriodLabel: string;
  summary: ReportSummary;
  previousSummary: ReportSummary | null;
  goalMetric: MetricKey;
  goalLabel: string;
  campaigns: CampaignSpendRow[];
}): Promise<ReportAiAnalysis | null> {
  const isEn = input.locale === "en";
  // R2.9 — rankeia por eficiência (CPA) priorizando quem converte; sem conversão
  // vai para o fim por gasto. Evita recomendações sobre campanhas irrelevantes.
  const rankedCampaigns = [...input.campaigns]
    .map((c) => ({ c, cpa: c.conversions > 0 ? c.spend / c.conversions : Infinity }))
    .sort((a, b) => {
      if (a.c.conversions > 0 && b.c.conversions === 0) return -1;
      if (b.c.conversions > 0 && a.c.conversions === 0) return 1;
      if (a.c.conversions > 0 && b.c.conversions > 0) return a.cpa - b.cpa;
      return b.c.spend - a.c.spend;
    })
    .map((x) => x.c);
  const topCampaigns = rankedCampaigns
    .slice(0, 5)
    .map(
      (c) =>
        `- ${c.name}: R$ ${c.spend.toFixed(2)}, ${c.conversions} conv.${
          c.conversions > 0 ? ` (CPA R$ ${(c.spend / c.conversions).toFixed(2)})` : ""
        }`
    )
    .join("\n");

  const prompt = isEn
    ? `You are a senior performance marketing analyst. Write a client-facing report analysis in English.

Client: ${input.clientName}
${input.accountLabel ? `Ad account: ${input.accountLabel}` : ""}
Period: ${input.periodLabel}
Compare with: ${input.prevPeriodLabel}

Metrics:
${formatMetricBlock(input.summary, input.previousSummary, input.goalMetric, input.goalLabel)}

Top campaigns by spend:
${topCampaigns || "(none)"}

Return JSON with:
- executiveSummary: 2-3 sentences summarizing performance vs previous period
- keyFindings: 2-5 bullet insights (concrete numbers when possible)
- recommendations: 2-4 actionable items for the next period (title, body, priority high|medium|low)

Be direct, professional, no fluff. Do not invent data not provided.`
    : `Você é analista sênior de tráfego pago. Escreva uma análise de relatório para o cliente, em português do Brasil.

Cliente: ${input.clientName}
${input.accountLabel ? `Conta de anúncios: ${input.accountLabel}` : ""}
Período: ${input.periodLabel}
Comparar com: ${input.prevPeriodLabel}

Métricas:
${formatMetricBlock(input.summary, input.previousSummary, input.goalMetric, input.goalLabel)}

Principais campanhas por investimento:
${topCampaigns || "(nenhuma)"}

Retorne JSON com:
- executiveSummary: 2-3 frases resumindo a performance vs período anterior
- keyFindings: 2-5 insights objetivos (use números quando possível)
- recommendations: 2-4 ações práticas para o próximo período (title, body, priority high|medium|low)

Seja direto e profissional. Não invente dados que não foram fornecidos.`;

  try {
    // Roteia pelo AI router: tarefa "analysis" → Claude Sonnet (acertividade)
    // quando habilitado, com fallback automático para Gemini.
    const { data, meta } = await aiGenerateJson({
      task: { kind: "analysis", complexity: "medium", label: "report.analysis" },
      prompt,
      schema: ClaudeReportSchema,
      temperature: 0.35
    });

    return {
      provider: meta.provider,
      executiveSummary: data.executiveSummary,
      keyFindings: data.keyFindings,
      recommendations: data.recommendations.map((r, i) => ({
        id: `ai-${i}`,
        title: r.title,
        body: r.body,
        priority: r.priority
      }))
    };
  } catch (err) {
    console.warn("[report-ai-analysis]", err);
    return null;
  }
}
