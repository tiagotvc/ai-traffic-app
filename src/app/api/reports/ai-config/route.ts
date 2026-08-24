import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { aiGenerateJson } from "@/lib/ai/generate";
import { aiCreditsErrorResponse, assertAiCreditsAccess } from "@/lib/ai-credits/credits-service";
import { getAppContext, slugify } from "@/lib/app-context";
import { METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";

/**
 * R2.6 — "Relatório por IA": converte um pedido em linguagem natural numa
 * configuração de relatório (cliente + período + tipo + métricas) via AI router.
 */
const ConfigSchema = z.object({
  clientSlug: z.string().nullable(),
  periodPreset: z.enum(["today", "yesterday", "thisWeek", "thisMonth", "last7", "last14", "last30"]),
  reportType: z.enum(["simple", "complete"]),
  metrics: z.array(z.string()).default([]),
  chartStyle: z.enum(["line", "area", "bar", "composed"]).default("line")
});

/** Nome em PT-BR de cada métrica — só pra deixar o prompt claro, não é usado como chave. */
const METRIC_PT_HINT: Record<MetricKey, string> = {
  reach: "alcance",
  impressions: "impressões",
  frequency: "frequência",
  clicks: "cliques",
  ctr: "CTR/taxa de clique",
  conversions: "conversões",
  messages: "mensagens",
  roas: "ROAS",
  cpmsg: "custo por mensagem",
  spend: "gasto/investimento",
  cpc: "CPC/custo por clique",
  cpm: "CPM",
  cpa: "CPA/custo por resultado"
};

const METRIC_KEYS = new Set<string>(METRIC_CATALOG.map((m) => m.key));

/** Data explícita (ex. "de 1 a 15 de julho", "10/07") que nenhum periodPreset representa. */
const EXPLICIT_DATE_PATTERN =
  /\b\d{1,2}\s*(\/|de)\s*(\d{1,2}|jan(eiro)?|fev(ereiro)?|mar(ço)?|abr(il)?|mai(o)?|jun(ho)?|jul(ho)?|ago(sto)?|set(embro)?|out(ubro)?|nov(embro)?|dez(embro)?)/i;

export async function POST(req: Request) {
  try {
    const { assertFeatureEnabled, FeatureDisabledError } = await import("@/lib/feature-flags/service");
    try {
      await assertFeatureEnabled("reports.v2");
    } catch (e) {
      if (e instanceof FeatureDisabledError) {
        return NextResponse.json({ ok: false, error: "reports_v2_disabled" }, { status: 404 });
      }
      throw e;
    }

    const { tenant } = await getAppContext();
    const body = (await req.json().catch(() => ({}))) as { prompt?: unknown };
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return NextResponse.json({ ok: false, error: "prompt_required" }, { status: 400 });

    let creditCost = 1;
    try {
      const access = await assertAiCreditsAccess({
        tenantId: tenant.id,
        kind: "report_ai_config",
        requireCreativeMemory: false
      });
      creditCost = access.creditsCharged;
    } catch (err) {
      const creditsRes = aiCreditsErrorResponse(err);
      if (creditsRes) return creditsRes;
      throw err;
    }

    const { client: repo } = await repositories();
    const clients = await repo.find({ where: { tenantId: tenant.id }, order: { name: "ASC" } });
    const options = clients.map((c) => ({ slug: slugify(c.name), name: c.name }));
    const clientList = options.map((o) => `- ${o.name} (slug: ${o.slug})`).join("\n") || "(nenhum)";

    const metricsVocab = METRIC_CATALOG.map((m) => `${m.key} (${METRIC_PT_HINT[m.key]})`).join(", ");

    const aiPrompt = [
      "Converta o pedido abaixo numa configuração de relatório de tráfego pago. Responda só com JSON.",
      `Pedido: "${prompt}"`,
      "",
      "Clientes disponíveis:",
      clientList,
      "",
      "JSON:",
      "- clientSlug: o slug do cliente, APENAS se o pedido citar um nome que bate com algum da lista",
      "  acima (nome completo, parcial ou apelido claro). NUNCA invente ou chute um cliente da lista",
      "  só porque ele existe — se o pedido não citar nenhum nome reconhecível, responda null.",
      "- periodPreset: um de today|yesterday|thisWeek|thisMonth|last7|last14|last30 (default last30).",
      "  Esses são os ÚNICOS períodos que existem — se o pedido citar uma data ou intervalo específico",
      "  (ex. \"de 1 a 15 de julho\", \"10/07\"), escolha o preset mais próximo, não invente outro.",
      "- reportType: 'complete' se o pedido pedir análise/IA/completo; senão 'simple'.",
      `- metrics: métricas citadas, usando EXATAMENTE estas chaves (nunca invente uma chave nova): ${metricsVocab}.`,
      "  [] se não citar nenhuma.",
      "- chartStyle: um de line|area|bar|composed (default 'line'). Use 'composed' só quando o pedido",
      "  claramente quiser comparar métricas diferentes juntas no mesmo gráfico (ex. \"gasto e ROAS no",
      "  mesmo gráfico\"); use 'bar' ou 'area' só se citado explicitamente; senão 'line'."
    ].join("\n");

    const { data, meta } = await aiGenerateJson({
      task: { kind: "extraction", complexity: "low", label: "report.ai-config" },
      prompt: aiPrompt,
      schema: ConfigSchema
    });

    const warnings: string[] = [];

    const clientSlug =
      data.clientSlug && options.some((o) => o.slug === data.clientSlug) ? data.clientSlug : null;
    if (data.clientSlug && !clientSlug) {
      warnings.push("Não consegui confirmar o cliente citado — selecione manualmente.");
    }

    if (EXPLICIT_DATE_PATTERN.test(prompt)) {
      warnings.push(
        `Você citou uma data específica, mas só existem períodos pré-definidos — usei "${data.periodPreset}" como aproximação. Ajuste o período manualmente se precisar do intervalo exato.`
      );
    }

    const validMetrics = data.metrics.filter((m) => METRIC_KEYS.has(m));
    const droppedMetrics = data.metrics.filter((m) => !METRIC_KEYS.has(m));
    if (droppedMetrics.length) {
      warnings.push(
        `Não reconheci essas métricas e elas não entraram no relatório: ${droppedMetrics.join(", ")}.`
      );
    }

    const { aiRecommendation: recRepo } = await repositories();
    await recRepo.save(
      recRepo.create({
        tenantId: tenant.id,
        clientId: null,
        targetId: "reports",
        actionType: "REPORT_AI_CONFIG",
        payload: {
          kind: "report_ai_config",
          promptPreview: prompt.slice(0, 120),
          creditsCharged: creditCost,
          warnings: warnings.length ? warnings : undefined
        },
        justification: `Relatório por IA: configuração (${creditCost} crédito(s))`,
        status: "APPLIED",
        creditsCharged: creditCost
      })
    );

    return NextResponse.json({
      ok: true,
      config: { ...data, clientSlug, metrics: validMetrics },
      warnings,
      provider: meta.provider,
      creditCost
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
