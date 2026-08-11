import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { executeAction } from "@/lib/engine/executor";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  clientSlug: z.string().min(1),
  title: z.string().min(1).max(120),
  evidence: z.string().min(1).max(160),
  metaCampaignId: z.string().min(1),
  campaignName: z.string().min(1).max(200),
  actionType: z.enum(["pause_campaign", "reactivate_campaign", "adjust_budget_percent"]),
  budgetPercent: z.number().min(-50).max(50).nullable()
});

/**
 * Aplica a ação de um `actionChip` do Commander — one-shot, `source: "chat"` no Engine
 * (nunca vira regra recorrente). Reaproveita o MESMO executor que Automações usa, então
 * herda os mesmos guardrails (piso de orçamento, checagem de fase de aprendizado, etc).
 */
export async function POST(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const result = await executeAction(
    {
      tenantId: tenant.id,
      clientId: client.id,
      source: "chat",
      metaCampaignId: body.metaCampaignId,
      campaignName: body.campaignName,
      actionType: body.actionType,
      payload: body.actionType === "adjust_budget_percent" ? { budgetPercent: body.budgetPercent } : null,
      description: body.title
    },
    metaAccessToken
  );

  if (result.ok) {
    try {
      const { clientLearning } = await repositories();
      await clientLearning.save(
        clientLearning.create({
          tenantId: tenant.id,
          clientId: client.id,
          metaCampaignId: body.metaCampaignId,
          title: body.title,
          description: `${body.evidence} — ação aplicada direto pelo Commander.`,
          category: "BUDGET",
          impact: "MEDIUM",
          confidence: "HIGH",
          source: "AI",
          status: "APPROVED",
          tags: ["commander", "action-chip", body.actionType],
          evidence: {
            text: body.evidence,
            actionType: body.actionType,
            budgetPercent: body.budgetPercent,
            executionId: result.execution.id
          },
          createdByUserId: user.id
        })
      );
    } catch (err) {
      // Aprendizado automático é best-effort — nunca derruba a confirmação da ação real.
      console.error("[commander apply-action] ClientLearning falhou", err);
    }
  }

  return NextResponse.json({
    ok: result.ok,
    executionId: result.execution.id,
    error: result.error ?? null
  });
}
