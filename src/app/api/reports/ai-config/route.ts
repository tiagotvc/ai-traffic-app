import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { aiGenerateJson } from "@/lib/ai/generate";
import { aiCreditsErrorResponse, assertAiCreditsAccess } from "@/lib/ai-credits/credits-service";
import { isAiCreditsV2Enabled } from "@/lib/ai-credits/feature-flags";
import { getAppContext, slugify } from "@/lib/app-context";

/**
 * R2.6 — "Relatório por IA": converte um pedido em linguagem natural numa
 * configuração de relatório (cliente + período + tipo + métricas) via AI router.
 */
const ConfigSchema = z.object({
  clientSlug: z.string().nullable(),
  periodPreset: z.enum(["today", "yesterday", "thisWeek", "thisMonth", "last7", "last14", "last30"]),
  reportType: z.enum(["simple", "complete"]),
  metrics: z.array(z.string()).default([])
});

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
        kind: "generic",
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

    const aiPrompt = [
      "Converta o pedido abaixo numa configuração de relatório de tráfego pago. Responda só com JSON.",
      `Pedido: "${prompt}"`,
      "",
      "Clientes disponíveis:",
      clientList,
      "",
      "JSON:",
      "- clientSlug: o slug do cliente que melhor casa com o pedido, ou null se não identificar.",
      "- periodPreset: um de today|yesterday|thisWeek|thisMonth|last7|last14|last30 (default last30).",
      "- reportType: 'complete' se o pedido pedir análise/IA/completo; senão 'simple'.",
      "- metrics: métricas citadas (spend, roas, cpa, ctr, conversions, clicks, cpm, messages); [] se não citar."
    ].join("\n");

    const { data, meta } = await aiGenerateJson({
      task: { kind: "extraction", complexity: "low", label: "report.ai-config" },
      prompt: aiPrompt,
      schema: ConfigSchema
    });

    const clientSlug =
      data.clientSlug && options.some((o) => o.slug === data.clientSlug) ? data.clientSlug : null;

    const v2 = await isAiCreditsV2Enabled();
    if (v2) {
      const { aiRecommendation: recRepo } = await repositories();
      await recRepo.save(
        recRepo.create({
          tenantId: tenant.id,
          clientId: null,
          targetId: "reports",
          actionType: "CM_AI_ACTIONS",
          payload: {
            kind: "report_ai_config",
            promptPreview: prompt.slice(0, 120),
            creditsCharged: creditCost
          },
          justification: `Relatório por IA: configuração (${creditCost} crédito(s))`,
          status: "APPLIED",
          creditsCharged: creditCost
        })
      );
    }

    return NextResponse.json({
      ok: true,
      config: { ...data, clientSlug },
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
