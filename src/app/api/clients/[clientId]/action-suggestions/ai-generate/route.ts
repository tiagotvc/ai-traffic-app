import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { runAiActionSuggestionsForClient } from "@/lib/creative-memory/ai-action-generator";
import {
  buildAiAnalysisResponse,
  shouldBillAiUsage
} from "@/lib/creative-memory/ai-analysis-response";
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

    const result = await runAiActionSuggestionsForClient(
      tenant.id,
      client.id,
      clientId,
      client.name,
      modelChain
    );

    if (shouldBillAiUsage(result)) {
      await recordCreativeMemoryAiUsage({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "actions",
        createdCount: result.created,
        modelMeta: result.modelMeta!
      });
    }

    return buildAiAnalysisResponse(result, {
      noApiKeyError: "IA não configurada. Defina GEMINI_API_KEY no servidor.",
      noMetricsMessage: "Sem métricas recentes para analisar.",
      noResultsMessage:
        "Nenhuma sugestão nova foi gerada. Os itens podem ter sido rejeitados pela validação ou já existir.",
      genericError: "Erro ao gerar sugestões com IA"
    });
  } catch (err) {
    console.error("[action-suggestions ai-generate]", err);
    return NextResponse.json({ ok: false, error: "Erro ao gerar sugestões com IA" }, { status: 500 });
  }
}
