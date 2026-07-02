import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertCopilotAccess } from "@/lib/billing/entitlements";
import {
  generateAiCampaignDraft,
  saveAiCampaignTemplate
} from "@/lib/campaign-creator/ai-campaign-orchestrator";
import {
  assertCreativeMemoryAiAccess,
  getGeminiApiKey,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import { classifyLlmError } from "@/lib/llm/generate-json";
import type { LlmProviderId } from "@/lib/llm/types";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  locale: z.string().default("pt-BR"),
  provider: z.enum(["gemini", "claude"]).default("gemini"),
  prompt: z.string().max(2000).optional()
});

export async function POST(req: Request) {
  let usedProvider: LlmProviderId = "gemini";
  try {
    await assertFeatureEnabled("campaigns.ai-generate");

    const { tenant, metaAccessToken } = await getAppContext();
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const body = BodySchema.parse(await req.json().catch(() => ({})));
    usedProvider = body.provider as LlmProviderId;

    try {
      await assertCopilotAccess(tenant.id);
      await assertCreativeMemoryAiAccess(tenant.id);
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const geminiApiKey = getGeminiApiKey();
    if (!geminiApiKey && body.provider === "gemini") {
      return NextResponse.json(
        { ok: false, error: "IA não configurada. Defina GEMINI_API_KEY no servidor." },
        { status: 503 }
      );
    }

    const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
    }

    const client = await getClientBySlugOrId(tenant.id, body.clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const signalsCtx = await import("@/lib/agency-brain/client-signals").then((m) =>
      m.loadClientSignals(tenant.id, client.id, 7)
    );

    if (!signalsCtx?.current.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "INSUFFICIENT_DATA",
          message:
            "Sem métricas recentes para analisar. Sincronize a Meta ou crie a campanha manualmente."
        },
        { status: 422 }
      );
    }

    const clientSlug = (await import("@/lib/app-context")).slugify(client.name) || client.id;

    const result = await generateAiCampaignDraft({
      tenantId: tenant.id,
      clientId: client.id,
      clientSlug,
      clientName: client.name,
      adAccountId: body.adAccountId,
      accessToken: metaAccessToken,
      locale: body.locale,
      provider: body.provider as LlmProviderId,
      userPrompt: body.prompt,
      geminiApiKey: geminiApiKey ?? ""
    });

    const template = await saveAiCampaignTemplate({
      tenantId: tenant.id,
      clientId: client.id,
      draftName: result.draftName,
      draft: result.draft
    });

    await recordCreativeMemoryAiUsage({
      tenantId: tenant.id,
      clientId: client.id,
      kind: "actions",
      createdCount: 1,
      modelMeta: {
        modelRequested: result.modelMeta.modelUsed,
        modelUsed: result.modelMeta.modelUsed,
        fallbackFrom: undefined
      }
    });

    return NextResponse.json({
      ok: true,
      draftId: template.id,
      draftName: result.draftName,
      strategy: result.strategy,
      rationale: result.rationale,
      referenceCampaignId: result.referenceCampaignId,
      suggestedAudiences: result.suggestedAudiences,
      validationWarning: result.validationWarning,
      provider: result.modelMeta.provider,
      modelUsed: result.modelMeta.modelUsed
    });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    console.error("[campaign-creator ai-generate]", err);
    const classified = classifyLlmError(err, usedProvider);
    return NextResponse.json(
      { ok: false, error: classified.message || "Erro ao gerar campanha com IA" },
      { status: 500 }
    );
  }
}
