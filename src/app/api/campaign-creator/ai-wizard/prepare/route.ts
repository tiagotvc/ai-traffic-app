import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId, getMetaAccessTokenForAdAccount } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import {
  AiWizardPrepareRequestSchema,
  assertWizardProviderConfigured,
  runWizardPreparePhase
} from "@/lib/campaign-creator/ai-wizard-prepare";
import { assertCreativeMemoryAiAccess } from "@/lib/creative-memory/ai-usage";
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

    const parsed = AiWizardPrepareRequestSchema.parse(await req.json().catch(() => ({})));
    const { phase, ...body } = parsed;
    usedProvider = assertWizardProviderConfigured((body.provider as "gemini" | "claude") ?? "claude");

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

    const { body: preparedBody, provider } = await runWizardPreparePhase({
      phase,
      body: { ...body, provider: usedProvider },
      accessToken,
      clientName: client.name
    });
    usedProvider = provider;

    return NextResponse.json({ ok: true, ...preparedBody, provider: usedProvider });
  } catch (err) {
    console.error("[ai-wizard prepare]", err);
    const classified = classifyLlmError(err, usedProvider);
    const message = err instanceof Error ? err.message : classified.message;
    return NextResponse.json(
      { ok: false, error: message || "Erro ao preparar campanha com IA" },
      { status: classified.status && classified.status >= 400 ? classified.status : 500 }
    );
  }
}
