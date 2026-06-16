import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import {
  buildAiAnalysisResponse,
  shouldBillAiUsage
} from "@/lib/creative-memory/ai-analysis-response";
import { runAiLearningSuggestionsForClient } from "@/lib/creative-memory/ai-learning-generator";
import { resolveCreativeMemoryModelChain } from "@/lib/creative-memory/models";
import {
  assertCreativeMemoryAiAccess,
  getCreativeMemoryAiStatus,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { tenant } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    try {
      await assertCreativeMemoryAiAccess(tenant.id);
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const aiStatus = await getCreativeMemoryAiStatus(tenant.id);
    const modelChain = resolveCreativeMemoryModelChain(aiStatus.planSlug);

    const result = await runAiLearningSuggestionsForClient(
      tenant.id,
      client.id,
      client.name,
      modelChain
    );

    if (shouldBillAiUsage(result)) {
      await recordCreativeMemoryAiUsage({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "learnings",
        createdCount: result.created,
        modelMeta: result.modelMeta!
      });
    }

    return buildAiAnalysisResponse(result, {
      noApiKeyError: "IA não configurada. Defina GEMINI_API_KEY no servidor.",
      noMetricsMessage: "Sem métricas recentes para analisar.",
      noResultsMessage:
        "Nenhum aprendizado novo foi gerado. Os itens podem ter sido rejeitados pela validação ou já existir na memória.",
      genericError: "Erro ao analisar com IA"
    });
  } catch (err) {
    console.error("[learnings ai-suggest]", err);
    return NextResponse.json({ ok: false, error: "Erro ao analisar com IA" }, { status: 500 });
  }
}
