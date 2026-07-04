import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

/**
 * Centro de Recomendações do Orion Cortex: as propostas de regra geradas pelo Brain
 * (Brain→Engine, com simulação anexada), agregadas em todos os clientes do tenant.
 * Aprovar/dispensar usa as rotas existentes de action-suggestions por cliente.
 */
export async function GET() {
  const { tenant } = await getAppContext();
  const { clientActionSuggestion: repo, client: clientRepo } = await repositories();

  const rows = await repo.find({
    where: { tenantId: tenant.id, status: "PENDING", actionType: "create_automation_rule" },
    order: { createdAt: "DESC" },
    take: 50
  });

  const clientIds = [...new Set(rows.map((r) => r.clientId))];
  const clients = clientIds.length
    ? await clientRepo.find({ where: { id: In(clientIds), tenantId: tenant.id } })
    : [];
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

  const items = rows.map((r) => {
    const payload = (r.actionPayload ?? {}) as {
      simulationSummary?: {
        days?: number;
        campaignsTriggered?: number;
        avoidedSpend?: number;
        dailyBudgetIncrease?: number;
      };
    };
    return {
      id: r.id,
      clientId: r.clientId,
      clientName: clientNameById.get(r.clientId) ?? "—",
      title: r.title,
      description: r.description,
      priority: r.priority,
      simulation: payload.simulationSummary ?? null,
      createdAt: r.createdAt
    };
  });

  const potentialSavings = items.reduce(
    (sum, i) => sum + (Number(i.simulation?.avoidedSpend) || 0),
    0
  );

  return NextResponse.json({
    ok: true,
    items,
    totals: { count: items.length, potentialSavings: Math.round(potentialSavings * 100) / 100 }
  });
}
