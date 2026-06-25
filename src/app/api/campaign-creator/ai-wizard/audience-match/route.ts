import { NextResponse } from "next/server";

import { getAppContext, getMetaAccessTokenForAdAccount } from "@/lib/app-context";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import { AiAudienceMatchSchema } from "@/lib/campaign-creator/ai-campaign-wizard-types";
import { matchAudiencesForWizard } from "@/lib/campaign-creator/ai-campaign-wizard-orchestrator";
import { classifyLlmError } from "@/lib/llm/generate-json";

export async function POST(req: Request) {
  try {
    const { tenant, user, metaAccessToken } = await getAppContext();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const body = AiAudienceMatchSchema.parse(await req.json().catch(() => ({})));
    const validation = await validateClientAdAccount(tenant.id, body.clientSlug, body.adAccountId);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
    }

    const accessToken =
      (await getMetaAccessTokenForAdAccount(tenant.id, user.id, body.adAccountId)) ?? metaAccessToken;

    const { personaSuggestions, metaAudienceSuggestions } = await matchAudiencesForWizard({
      tenantId: tenant.id,
      userId: user.id,
      accessToken,
      adAccountId: body.adAccountId,
      businessDescription: body.businessDescription,
      targetProfile: body.targetProfile,
      provider: body.provider
    }).catch((err) => {
      console.warn("[ai-wizard audience-match] optional match failed:", err);
      return { personaSuggestions: [], metaAudienceSuggestions: [] };
    });

    return NextResponse.json({
      ok: true,
      personaSuggestions,
      metaAudienceSuggestions
    });
  } catch (err) {
    console.error("[ai-wizard audience-match]", err);
    const classified = classifyLlmError(err, "gemini");
    return NextResponse.json(
      { ok: false, error: classified.message || "Erro ao analisar públicos" },
      { status: 500 }
    );
  }
}
