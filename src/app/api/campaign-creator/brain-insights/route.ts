import { NextResponse } from "next/server";
import { z } from "zod";

import { CAMPAIGN_OBJECTIVES } from "@/lib/campaign-draft";
import { buildCreatorBrainInsight } from "@/lib/campaign-creator/creator-brain-insights";
import {
  aiCreditsErrorResponse,
  assertAiCreditsAccess,
  resolveCreditCost
} from "@/lib/ai-credits/credits-service";
import { getAiCreditWeights, isAiCreditsV2Enabled } from "@/lib/ai-credits/feature-flags";
import { getTenantAiPolicy } from "@/lib/ai-credits/policy-service";
import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { listClientIdsForUser } from "@/lib/client-meta-settings";

const QuerySchema = z.object({
  clientSlug: z.string().min(1).optional(),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  activeNode: z.enum(["campaign", "adset", "ad", "review"]).default("campaign")
});

export async function GET(req: Request) {
  try {
    const { tenant, user, metaAccessToken } = await getAppContext();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const clientSlug = url.searchParams.get("clientSlug")?.trim() || undefined;
    const parsed = QuerySchema.safeParse({
      clientSlug,
      objective: url.searchParams.get("objective")?.trim(),
      activeNode: url.searchParams.get("activeNode")?.trim() || "campaign"
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Parâmetros inválidos" }, { status: 400 });
    }

    let clientId: string | null = null;
    if (parsed.data.clientSlug) {
      const client = await getClientBySlugOrId(tenant.id, parsed.data.clientSlug);
      if (!client) {
        return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
      }

      const allowedClientIds = await listClientIdsForUser(tenant.id, user.id);
      if (allowedClientIds?.length && !allowedClientIds.includes(client.id)) {
        return NextResponse.json({ ok: false, error: "Sem acesso a este cliente" }, { status: 403 });
      }

      clientId = client.id;
    }

    let creditCost = 1;
    try {
      const access = await assertAiCreditsAccess({
        tenantId: tenant.id,
        clientId,
        kind: "creator_brain",
        requireCreativeMemory: false
      });
      creditCost = access.creditsCharged;
    } catch (err) {
      const creditsRes = aiCreditsErrorResponse(err);
      if (creditsRes) return creditsRes;
      throw err;
    }

    const insight = await buildCreatorBrainInsight({
      tenantId: tenant.id,
      clientId,
      objective: parsed.data.objective,
      activeNode: parsed.data.activeNode,
      metaAccessToken: metaAccessToken ?? null,
      creditCost
    });

    const v2 = await isAiCreditsV2Enabled();
    if (v2 && clientId) {
      const [weights, policy] = await Promise.all([
        getAiCreditWeights(),
        getTenantAiPolicy(tenant.id)
      ]);
      const charged = resolveCreditCost("creator_brain", weights, policy.customWeights);
      const { aiRecommendation: recRepo } = await repositories();
      await recRepo.save(
        recRepo.create({
          tenantId: tenant.id,
          clientId,
          targetId: "campaign_creator",
          actionType: "CM_AI_ACTIONS",
          payload: {
            kind: "creator_brain",
            objective: parsed.data.objective,
            activeNode: parsed.data.activeNode,
            insightVariant: insight.insightVariant ?? null,
            creditsCharged: charged
          },
          justification: `Orion Brain (criador): insight ${parsed.data.objective} (${charged} crédito(s))`,
          status: "APPLIED",
          creditsCharged: charged
        })
      );
    }

    return NextResponse.json({ ok: true, insight, creditCost });
  } catch (err) {
    console.error("[campaign-creator/brain-insights]", err);
    return NextResponse.json({ ok: false, error: "Falha ao gerar insight" }, { status: 500 });
  }
}
