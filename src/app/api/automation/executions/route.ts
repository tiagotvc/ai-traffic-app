import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import type { EngineExecutionStatus } from "@/db/entities/EngineExecution";
import { getAppContext } from "@/lib/app-context";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

const STATUSES: EngineExecutionStatus[] = ["pending", "rejected", "executed", "failed"];

/**
 * Histórico global de execuções do Orion Engine (Nível 5 do motor de regras): tudo que
 * o Engine fez ou enfileirou, de qualquer fonte (regra, chat, creator), com o motivo.
 */
export async function GET(req: Request) {
  const { tenant, user, platformAdmin } = await getAppContext();

  const enabled = await isPlatformFeatureEnabled("engine.executionsTab", {
    userId: user.id,
    isPlatformAdmin: platformAdmin
  });
  if (!enabled) return NextResponse.json({ ok: true, executions: [] });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status = STATUSES.includes(statusParam as EngineExecutionStatus)
    ? (statusParam as EngineExecutionStatus)
    : null;

  const { engineExecution: repo } = await repositories();
  const rows = await repo.find({
    where: status ? { tenantId: tenant.id, status } : { tenantId: tenant.id },
    order: { createdAt: "DESC" },
    take: 100
  });

  return NextResponse.json({
    ok: true,
    executions: rows.map((r) => ({
      id: r.id,
      source: r.source,
      actionType: r.actionType,
      status: r.status,
      metaCampaignId: r.metaCampaignId,
      campaignName: r.campaignName,
      description: r.description,
      result: r.result ?? null,
      error: r.error ?? null,
      createdAt: r.createdAt,
      executedAt: r.executedAt ?? null
    }))
  });
}
