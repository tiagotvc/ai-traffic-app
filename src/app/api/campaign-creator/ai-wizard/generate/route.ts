import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId, getMetaAccessTokenForAdAccount } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import {
  assertWizardProviderConfigured,
  prepareWizardAiInputs
} from "@/lib/campaign-creator/ai-wizard-prepare";
import {
  generateAiCampaignFromWizard
} from "@/lib/campaign-creator/ai-campaign-wizard-orchestrator";
import { AiCampaignWizardGenerateSchema } from "@/lib/campaign-creator/ai-campaign-wizard-types";
import { saveAiCampaignTemplate } from "@/lib/campaign-creator/ai-campaign-orchestrator";
import {
  assertCreativeMemoryAiAccess,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";
import { classifyLlmError } from "@/lib/llm/generate-json";

export async function POST(req: Request) {
  let usedProvider: "gemini" | "claude" = "claude";
  try {
    const { tenant, user, metaAccessToken } = await getAppContext();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const body = AiCampaignWizardGenerateSchema.parse(await req.json().catch(() => ({})));
    const preferredProvider = assertWizardProviderConfigured(
      (body.provider as "gemini" | "claude") ?? "claude"
    );

    try {
      await assertCreativeMemoryAiAccess(tenant.id);
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const validation = await validateClientAdAccount(tenant.id, body.clientSlug, body.adAccountId);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
    }

    const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const accessToken =
      (await getMetaAccessTokenForAdAccount(tenant.id, user.id, body.adAccountId)) ?? metaAccessToken;

    const { body: preparedBody, provider } = await prepareWizardAiInputs({
      body: { ...body, provider: preferredProvider },
      accessToken,
      clientName: client.name
    });
    usedProvider = provider;

    const result = await generateAiCampaignFromWizard({
      tenantId: tenant.id,
      userId: user.id,
      clientId: client.id,
      clientSlug: body.clientSlug,
      clientName: client.name,
      accessToken,
      body: preparedBody
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
        modelRequested: usedProvider,
        modelUsed: usedProvider,
        fallbackFrom: undefined
      }
    });

    return NextResponse.json({
      ok: true,
      draftId: template.id,
      draftName: result.draftName,
      rationale: result.rationale
    });
  } catch (err) {
    console.error("[ai-wizard generate]", err);
    const classified = classifyLlmError(err, usedProvider);
    return NextResponse.json(
      { ok: false, error: classified.message || "Erro ao gerar campanha com IA" },
      { status: 500 }
    );
  }
}
