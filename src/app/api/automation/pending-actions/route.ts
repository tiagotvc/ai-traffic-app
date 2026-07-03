import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import type { EngineExecutionStatus } from "@/db/entities/EngineExecution";
import { getAppContext } from "@/lib/app-context";

/**
 * Fila de pendências do Engine. Desde a Fase 1 da arquitetura (docs/orion-architecture
 * §2.1), uma pendência é uma `engine_execution` com `status: "pending"` — a tabela
 * `automation_pending_actions` está deprecada. A resposta mantém o shape antigo
 * (`actions[]`) para o client.
 */
export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const raw = new URL(req.url).searchParams.get("status") ?? "pending";
  const status: EngineExecutionStatus =
    raw === "rejected" ? "rejected" : raw === "approved" ? "executed" : "pending";

  const { engineExecution: repo } = await repositories();
  const rows = await repo.find({
    where: { tenantId: tenant.id, status },
    order: { createdAt: "DESC" },
    take: 100
  });

  return NextResponse.json({
    ok: true,
    actions: rows.map((r) => ({
      id: r.id,
      automationRuleId: r.automationRuleId,
      clientId: r.clientId,
      metaCampaignId: r.metaCampaignId,
      campaignName: r.campaignName,
      actionType: r.actionType,
      budgetPercent: r.payload?.budgetPercent ?? null,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt
    }))
  });
}
