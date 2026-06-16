import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { runAiHypothesisSuggestionsForClient } from "@/lib/agency-brain/hypothesis-generator";
import { listHypotheses } from "@/lib/agency-brain/hypothesis-service";
import {
  buildAiAnalysisResponse,
  shouldBillAiUsage
} from "@/lib/creative-memory/ai-analysis-response";
import {
  assertCreativeMemoryAiAccess,
  getCreativeMemoryAiStatus,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";
import { resolveCreativeMemoryModelChain } from "@/lib/creative-memory/models";

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
      await assertLimit(tenant.id, "allowAgencyBrainHypotheses");
      await assertCreativeMemoryAiAccess(tenant.id);
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const aiStatus = await getCreativeMemoryAiStatus(tenant.id);
    const modelChain = resolveCreativeMemoryModelChain(aiStatus.planSlug);
    const existing = await listHypotheses(tenant.id, client.id, { pageSize: 50 });

    const result = await runAiHypothesisSuggestionsForClient(
      tenant.id,
      client.id,
      client.name,
      modelChain,
      existing.items.map((h) => h.title)
    );

    if (shouldBillAiUsage(result)) {
      await recordCreativeMemoryAiUsage({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "hypotheses",
        createdCount: result.created,
        modelMeta: result.modelMeta!
      });
    }

    return buildAiAnalysisResponse(result, {
      noApiKeyError: "IA não configurada. Defina GEMINI_API_KEY no servidor.",
      noMetricsMessage: "Sem métricas recentes para analisar.",
      noResultsMessage:
        "Nenhuma hipótese nova foi gerada. Os itens podem ter sido rejeitados pela validação ou já existir.",
      genericError: "Erro ao gerar hipóteses com IA"
    });
  } catch (err) {
    console.error("[hypotheses ai-suggest]", err);
    return NextResponse.json({ ok: false, error: "Erro ao gerar hipóteses com IA" }, { status: 500 });
  }
}
