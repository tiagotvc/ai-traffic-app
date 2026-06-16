import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { AgencyBrainChatSchema } from "@/lib/agency-brain/schemas";
import {
  assertCreativeMemoryAiAccess,
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

    try {
      await assertLimit(tenant.id, "allowAgencyBrainChat");
      await assertCreativeMemoryAiAccess(tenant.id);
    } catch (err) {
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

    const brain = await getClientBrainContext(tenant.id, client.id);
    const aiStatus = await getCreativeMemoryAiStatus(tenant.id);
    const modelChain = resolveCreativeMemoryModelChain(aiStatus.planSlug);

    const prompt = [
      "Você é um assistente de performance marketing da agência.",
      "Responda em português, de forma clara e acionável.",
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
      modelUsed: modelMeta.modelUsed
    });
  } catch (err) {
    console.error("[agency-brain chat]", err);
    return NextResponse.json({ ok: false, error: "Erro ao processar chat" }, { status: 500 });
  }
}
