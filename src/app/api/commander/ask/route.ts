import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { askCommander } from "@/lib/commander/ask";
import { canUseCommander } from "@/lib/commander/access";
import {
  aiCreditsErrorResponse,
  assertCreativeMemoryAiAccess,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { classifyLlmError, llmErrorHttpStatus } from "@/lib/llm/generate-json";

const BodySchema = z.object({
  question: z.string().min(2).max(500),
  clientSlug: z.string().min(1),
  draft: z
    .object({
      objective: z.string().max(120).optional(),
      campaignName: z.string().max(200).optional(),
      dailyBudgetBRL: z.number().min(0).optional(),
      adsetName: z.string().max(200).optional(),
      hasMedia: z.boolean().optional(),
      personaSelected: z.boolean().optional(),
      step: z.string().max(60).optional()
    })
    .default({}),
  insights: z
    .array(
      z.object({
        title: z.string().max(200),
        description: z.string().max(500),
        source: z.string().max(80)
      })
    )
    .max(6)
    .optional()
});

/**
 * Chat do Orion Commander no criador de campanha. Mesmo gate composto do
 * `/api/campaign-creator/flags` (env + flag de plataforma + plano) e mesmo esquema de
 * créditos de IA do chat do Brain (`kind: "chat"`).
 */
export async function POST(req: Request) {
  try {
    const { tenant, user, platformAdmin, entitlements } = await getAppContext();
    const body = BodySchema.parse(await req.json().catch(() => ({})));

    const context = { userId: user.id, isPlatformAdmin: platformAdmin };
    const [commanderPlatform, memoryFlag] = await Promise.all([
      isPlatformFeatureEnabled("campaigns.commander", context),
      isPlatformFeatureEnabled("campaigns.commander.memory", context)
    ]);
    const allowed = canUseCommander({
      planSlug: entitlements.planSlug,
      allowCommander: entitlements.limits.allowCommander,
      platformEnabled: commanderPlatform,
      environmentEnabled: process.env.ENABLE_COMMANDER !== "false",
      platformAdmin
    });
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Commander indisponível no seu plano" }, { status: 403 });
    }

    const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    try {
      await assertCreativeMemoryAiAccess(tenant.id, client.id, "chat");
    } catch (err) {
      const creditsRes = aiCreditsErrorResponse(err);
      if (creditsRes) return creditsRes;
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const result = await askCommander({
      tenantId: tenant.id,
      clientId: client.id,
      clientName: client.name,
      question: body.question,
      draft: body.draft,
      insights: body.insights,
      memoryEnabled: memoryFlag
    });

    await recordCreativeMemoryAiUsage({
      tenantId: tenant.id,
      clientId: client.id,
      kind: "chat",
      createdCount: 1,
      modelMeta: {
        modelRequested: result.modelRequested,
        modelUsed: result.modelUsed,
        fallbackFrom: result.fallbackFrom
      }
    });

    return NextResponse.json({
      ok: true,
      answer: result.answer,
      provider: result.provider,
      modelUsed: result.modelUsed,
      memoryUsed: memoryFlag
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Pergunta inválida" }, { status: 400 });
    }
    console.error("[commander ask]", err);
    const classified = classifyLlmError(err);
    return NextResponse.json(
      { ok: false, error: classified.message || "Erro ao consultar o Commander" },
      { status: llmErrorHttpStatus(classified) }
    );
  }
}
