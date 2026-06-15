import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { runAiActionSuggestionsForClient } from "@/lib/creative-memory/ai-action-generator";
import {
  assertCreativeMemoryAiQuota,
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
      await assertCreativeMemoryAiQuota(tenant.id);
    } catch (err) {
      const res = billingErrorResponse(err);
      if (res) return res;
      throw err;
    }

    const result = await runAiActionSuggestionsForClient(
      tenant.id,
      client.id,
      clientId,
      client.name
    );

    if (result.skippedReason === "no_api_key") {
      return NextResponse.json({
        ok: false,
        code: "NO_AI_KEY",
        error: "IA não configurada. Defina GEMINI_API_KEY no servidor."
      });
    }

    if (result.skippedReason === "no_metrics") {
      return NextResponse.json({
        ok: true,
        created: 0,
        suggestions: [],
        message: "Sem métricas recentes para analisar."
      });
    }

    if (result.created > 0) {
      await recordCreativeMemoryAiUsage({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "actions",
        createdCount: result.created
      });
    } else if (!result.skippedReason) {
      await recordCreativeMemoryAiUsage({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "actions",
        createdCount: 0
      });
    }

    return NextResponse.json({ ok: true, ...result, ai: true });
  } catch (err) {
    console.error("[action-suggestions ai-generate]", err);
    return NextResponse.json({ ok: false, error: "Erro ao gerar sugestões com IA" }, { status: 500 });
  }
}
