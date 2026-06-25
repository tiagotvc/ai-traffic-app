import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { createActionSuggestion, executeActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";
import { getAiCreditsFeatureFlags } from "@/lib/ai-credits/feature-flags";

const ProposalExecuteSchema = z.object({
  clientId: z.string().min(1),
  proposal: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    actionType: z.enum([
      "scale_budget",
      "pause_campaign",
      "duplicate_audience",
      "refresh_creative",
      "review_campaign"
    ]),
    metaCampaignId: z.string().nullable().optional(),
    budgetIncreasePercent: z.number().min(1).max(50).nullable().optional(),
    learningTitle: z.string().max(200).nullable().optional(),
    linkedLearningId: z.string().uuid().nullable().optional(),
    evidenceReason: z.string().max(500).optional()
  })
});

export async function POST(req: Request) {
  try {
    const flags = await getAiCreditsFeatureFlags();
    if (!flags.agentLayerEnabled) {
      return NextResponse.json(
        { ok: false, code: "AGENT_LAYER_OFF", error: "Camada agente não está ativa" },
        { status: 403 }
      );
    }

    const { tenant, user } = await getAppContext();
    const body = ProposalExecuteSchema.parse(await req.json());
    const client = await getClientBySlugOrId(tenant.id, body.clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const p = body.proposal;
    const dedupeKey = `chat_exec:${client.id}:${p.actionType}:${p.metaCampaignId ?? "none"}:${Date.now()}`;

    const created = await createActionSuggestion(tenant.id, client.id, {
      title: p.title,
      description: p.description,
      actionType: p.actionType,
      actionPayload: {
        metaCampaignId: p.metaCampaignId ?? undefined,
        budgetIncreasePercent: p.budgetIncreasePercent ?? undefined
      },
      source: "AI",
      metaCampaignId: p.metaCampaignId ?? null,
      linkedLearningId: p.linkedLearningId ?? null,
      linkedLearningIds: p.linkedLearningId ? [p.linkedLearningId] : [],
      priority: "HIGH",
      evidence: {
        ruleId: "chat_agent",
        reason: p.evidenceReason ?? p.learningTitle ?? "Proposta do chat do Cérebro",
        brainContextSnippet: p.learningTitle ?? undefined
      },
      dedupeKey
    });

    if (!created) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível registrar a proposta (duplicada recentemente)" },
        { status: 409 }
      );
    }

    if (p.actionType !== "pause_campaign" && p.actionType !== "scale_budget") {
      return NextResponse.json({
        ok: true,
        executed: false,
        suggestion: created,
        detail: "Ação registrada — conclua manualmente no Gerenciador"
      });
    }

    const { suggestion, meta } = await executeActionSuggestion(
      tenant.id,
      client.id,
      created.id,
      user?.id
    );

    return NextResponse.json({
      ok: true,
      executed: meta?.applied ?? false,
      suggestion,
      meta
    });
  } catch (err) {
    console.error("[chat proposal execute]", err);
    return NextResponse.json({ ok: false, error: "Erro ao executar proposta" }, { status: 500 });
  }
}
