import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { askCommander } from "@/lib/commander/ask";
import { canUseCommander } from "@/lib/commander/access";
import { appendCommanderTurn, getCommanderHistoryForPrompt } from "@/lib/commander/conversation";
import {
  aiCreditsErrorResponse,
  assertCreativeMemoryAiAccess,
  getCreativeMemoryAiStatus,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { classifyLlmError, llmErrorHttpStatus } from "@/lib/llm/generate-json";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  question: z.string().min(2).max(500),
  clientSlug: z.string().min(1),
  // Ausente = fora do criador de campanha (chat geral) — nunca vira "rascunho vazio".
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
    .optional(),
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

type CreditsInfo = { used: number; remaining: number; limit: number } | null;

type StreamEvent =
  | { phase: "status"; label: string }
  | {
      phase: "done";
      answer: string;
      ruleProposal: unknown;
      actionChips: unknown;
      provider: string;
      modelUsed: string;
      usage?: { inputTokens: number; outputTokens: number; costUsd?: number };
      credits: CreditsInfo;
    }
  | { phase: "error"; error: string; status: number };

/**
 * Chat do Orion Commander — SSE (progresso real, não decorativo) em vez de JSON simples.
 * Mesmo gate composto do `/api/campaign-creator/flags` (env + flag de plataforma + plano)
 * e mesmo esquema de créditos de IA do chat do Brain (`kind: "chat"`).
 */
export async function POST(req: Request) {
  const { tenant, user, platformAdmin, entitlements, metaAccessToken } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const context = { userId: user.id, isPlatformAdmin: platformAdmin };
  const [commanderPlatform, memoryFlag, ruleProposalsFlag, parametersFlag] = await Promise.all([
    isPlatformFeatureEnabled("commander.modules.campaigns", context),
    isPlatformFeatureEnabled("commander.memory", context),
    isPlatformFeatureEnabled("commander.ruleProposals", context),
    isPlatformFeatureEnabled("commander.parametersContext", context)
  ]);
  const userDisabled = new Set(tenant.commanderDisabledCapabilities ?? []);
  const allowed = canUseCommander({
    planSlug: entitlements.planSlug,
    allowCommander: entitlements.limits.allowCommander,
    platformEnabled: commanderPlatform,
    environmentEnabled: process.env.ENABLE_COMMANDER !== "false",
    platformAdmin,
    userEnabled: !userDisabled.has("commander")
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* stream fechado */
        }
      };

      try {
        const history = await getCommanderHistoryForPrompt(tenant.id, client.id);

        const result = await askCommander({
          tenantId: tenant.id,
          clientId: client.id,
          clientName: client.name,
          question: body.question,
          draft: body.draft,
          insights: body.insights,
          history,
          memoryEnabled: memoryFlag && !userDisabled.has("commander.memory"),
          metaAccessToken,
          ruleProposalsEnabled: ruleProposalsFlag && !userDisabled.has("commander.ruleProposals"),
          parametersEnabled: parametersFlag && !userDisabled.has("commander.parametersContext"),
          emit: (label) => send({ phase: "status", label })
        });

        await appendCommanderTurn({
          tenantId: tenant.id,
          clientId: client.id,
          question: body.question,
          answer: result.answer,
          ruleProposal: result.ruleProposal as unknown as Record<string, unknown> | null,
          actionChips: result.actionChips as unknown as Record<string, unknown>[]
        });

        await recordCreativeMemoryAiUsage({
          tenantId: tenant.id,
          clientId: client.id,
          kind: "chat",
          createdCount: 1,
          modelMeta: {
            modelRequested: result.modelRequested,
            modelUsed: result.modelUsed,
            fallbackFrom: result.fallbackFrom,
            usage: result.usage
          },
          content: {
            question: body.question,
            answer: result.answer
          }
        });

        let credits: CreditsInfo = null;
        try {
          const status = await getCreativeMemoryAiStatus(tenant.id);
          credits = {
            used: 1,
            remaining: Number.isFinite(status.usage.remaining) ? status.usage.remaining : -1,
            limit: status.usage.maxAiRequestsPerMonth
          };
        } catch {
          /* uso/créditos são só telemetria de UI — nunca derrubam a resposta */
        }

        send({
          phase: "done",
          answer: result.answer,
          // Aresta Commander→Engine: proposta de regra (payload do POST /api/automation/rules)
          // com simulação anexada. O client decide criar (human-in-the-loop).
          ruleProposal: result.ruleProposal,
          // Ações pontuais (source: "chat") — um clique aplica direto, sem virar regra.
          actionChips: result.actionChips,
          provider: result.provider,
          modelUsed: result.modelUsed,
          usage: result.usage,
          credits
        });
      } catch (err) {
        console.error("[commander ask]", err);
        const classified = classifyLlmError(err);
        send({
          phase: "error",
          error: classified.message || "Erro ao consultar o Commander",
          status: llmErrorHttpStatus(classified)
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
