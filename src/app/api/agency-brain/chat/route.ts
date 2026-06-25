import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { generateChatAgentResponse } from "@/lib/agency-brain/chat-agent-service";
import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { AgencyBrainChatSchema } from "@/lib/agency-brain/schemas";
import { getAiCreditsFeatureFlags } from "@/lib/ai-credits/feature-flags";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import {
  assertCreativeMemoryAiAccess,
  aiCreditsErrorResponse,
  getCreativeMemoryAiStatus,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";
import { resolveCreativeMemoryModelChain } from "@/lib/creative-memory/models";
import { getGeminiApiKey } from "@/lib/creative-memory/ai-usage";
import { geminiGenerateJson } from "@/lib/gemini";

const ChatResponseSchema = z.object({
  answer: z.string().min(1).max(4000)
});

export async function POST(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const body = AgencyBrainChatSchema.extend({
      clientId: z.string().min(1)
    }).parse(await req.json());

    const client = await getClientBySlugOrId(tenant.id, body.clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const flags = await getAiCreditsFeatureFlags();
    const agentMode = flags.agentLayerEnabled;

    try {
      await assertLimit(tenant.id, "allowAgencyBrainChat");
      await assertCreativeMemoryAiAccess(
        tenant.id,
        client.id,
        agentMode ? "chat_with_proposals" : "chat"
      );
    } catch (err) {
      const creditsRes = aiCreditsErrorResponse(err);
      if (creditsRes) return creditsRes;
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        code: "NO_AI_KEY",
        error: "IA não configurada. Defina GEMINI_API_KEY no servidor."
      });
    }

    const aiStatus = await getCreativeMemoryAiStatus(tenant.id);
    const modelChain = resolveCreativeMemoryModelChain(aiStatus.planSlug);
    const isMeeting = body.mode === "meeting";

    if (agentMode) {
      const agentResult = await generateChatAgentResponse({
        apiKey,
        tenantId: tenant.id,
        client,
        message: body.message,
        meetingMode: isMeeting,
        modelChain
      });

      await recordCreativeMemoryAiUsage({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "chat",
        creditKind: "chat_with_proposals",
        createdCount: 1,
        modelMeta: agentResult.modelMeta
      });

      return NextResponse.json({
        ok: true,
        answer: agentResult.answer,
        proposals: agentResult.proposals,
        agentMode: true,
        modelUsed: modelChain[0]
      });
    }

    const brain = await getClientBrainContext(tenant.id, client.id);
    const prompt = [
      isMeeting
        ? "Você está em Modo Reunião com o cliente. Responda em português com tom profissional e consultivo."
        : "Você é um assistente de performance marketing da agência.",
      isMeeting
        ? "Estruture a resposta com: Resumo executivo, Destaques positivos, Pontos de atenção, Próximos passos recomendados."
        : "Responda em português, de forma clara e acionável.",
      "Use apenas o contexto abaixo — se não souber, diga que falta informação.",
      "",
      `Cliente: ${client.name}`,
      "",
      "Memória operacional:",
      brain.summaryText,
      "",
      "DNA:",
      brain.dna?.summaryText ?? "(não derivado)",
      "",
      "Aprendizados recentes:",
      brain.recentLearnings.map((l) => `- ${l.title}: ${l.description.slice(0, 120)}`).join("\n") ||
        "(nenhum)",
      "",
      `Pergunta do usuário: ${body.message}`
    ].join("\n");

    const { data, ...modelMeta } = await geminiGenerateJson({
      apiKey,
      prompt,
      schema: ChatResponseSchema,
      modelChain
    });

    await recordCreativeMemoryAiUsage({
      tenantId: tenant.id,
      clientId: client.id,
      kind: "chat",
      createdCount: 1,
      modelMeta
    });

    return NextResponse.json({
      ok: true,
      answer: data.answer,
      agentMode: false,
      modelUsed: modelMeta.modelUsed
    });
  } catch (err) {
    console.error("[agency-brain chat]", err);
    return NextResponse.json({ ok: false, error: "Erro ao processar chat" }, { status: 500 });
  }
}
