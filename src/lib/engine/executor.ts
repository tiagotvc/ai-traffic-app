import "server-only";

import { repositories } from "@/db/repositories";
import type {
  EngineActionType,
  EngineExecution,
  EngineExecutionSource
} from "@/db/entities/EngineExecution";
import { emitDomainEvent } from "@/lib/events/domain-events";
import {
  activateCampaign,
  fetchCampaign,
  pauseCampaign,
  updateCampaignDailyBudget
} from "@/lib/meta-graph";

/**
 * Executor unificado do Orion Engine (docs/orion-architecture §2.1).
 *
 * Toda ação com efeito externo (Meta, e-mail) passa por aqui, independentemente de quem
 * pediu — motor de regras, chat, criador de campanha ou workflow futuro. O executor:
 * 1. executa o efeito (ou enfileira para aprovação humana),
 * 2. registra a linha em `engine_executions` (o log canônico do Engine),
 * 3. emite o `domain_event` correspondente (aresta Engine→resto do ecossistema).
 *
 * Os `Alert`s continuam sendo escritos pelos chamadores: eles são a projeção de UI e o
 * state-tracking do motor (dedupe diário, passos de escalada, chaves de agenda) — não
 * são o log de execução.
 */

export type EngineActionInput = {
  tenantId: string;
  clientId?: string | null;
  source: EngineExecutionSource;
  sourceId?: string | null;
  automationRuleId?: string | null;
  metaCampaignId?: string | null;
  campaignName?: string | null;
  actionType: EngineActionType;
  payload?: Record<string, unknown> | null;
  description: string;
};

export type EngineActionResult = {
  ok: boolean;
  execution: EngineExecution;
  result?: Record<string, unknown>;
  error?: string;
};

/** Executa o efeito externo da ação. Lança em falha — o chamador decide o status. */
async function performEngineAction(
  metaAccessToken: string | undefined,
  input: Pick<EngineActionInput, "actionType" | "metaCampaignId" | "payload" | "description">
): Promise<Record<string, unknown>> {
  const payload = input.payload ?? {};

  switch (input.actionType) {
    case "pause_campaign": {
      if (!metaAccessToken || !input.metaCampaignId) throw new Error("Meta não conectada");
      await pauseCampaign(metaAccessToken, input.metaCampaignId);
      return { detail: "Campanha pausada na Meta" };
    }
    case "reactivate_campaign": {
      if (!metaAccessToken || !input.metaCampaignId) throw new Error("Meta não conectada");
      await activateCampaign(metaAccessToken, input.metaCampaignId);
      return { detail: "Campanha reativada na Meta" };
    }
    case "adjust_budget_percent":
    case "scale_gradual_step":
    case "scale_budget": {
      if (!metaAccessToken || !input.metaCampaignId) throw new Error("Meta não conectada");
      const pct = Number(payload.budgetPercent) || 10;
      const campaign = await fetchCampaign(metaAccessToken, input.metaCampaignId);
      const currentMinor = Number(campaign.daily_budget ?? 0);
      if (!currentMinor) throw new Error("Orçamento diário não disponível na campanha");
      const nextMinor = Math.round(currentMinor * (1 + pct / 100));
      await updateCampaignDailyBudget(metaAccessToken, input.metaCampaignId, nextMinor);
      return { budgetBeforeMinor: currentMinor, budgetAfterMinor: nextMinor, percent: pct };
    }
    case "notify_email": {
      const to = String(payload.recipientEmail ?? "");
      if (!to) throw new Error("E-mail de destino não informado");
      const { sendReportEmail } = await import("@/lib/report-notify");
      await sendReportEmail({
        to,
        subject: String(payload.subject ?? "[Orion] Automação"),
        text: input.description
      });
      return { detail: `E-mail enviado para ${to}` };
    }
    case "meta_apply":
      // Registrado por rotas que já executaram o efeito por conta própria (creator).
      return {};
    default:
      throw new Error(`Tipo de ação não suportado: ${input.actionType}`);
  }
}

/** Executa a ação agora e registra o resultado (status `executed`/`failed`). */
export async function executeAction(
  input: EngineActionInput,
  metaAccessToken?: string
): Promise<EngineActionResult> {
  const { engineExecution: repo } = await repositories();

  let result: Record<string, unknown> | undefined;
  let error: string | undefined;
  try {
    result = await performEngineAction(metaAccessToken, input);
  } catch (err) {
    error = err instanceof Error ? err.message : "Erro ao executar ação";
  }

  const execution = await repo.save(
    repo.create({
      ...baseColumns(input),
      status: error ? "failed" : "executed",
      result: result ?? null,
      error: error ?? null,
      executedAt: error ? null : new Date()
    })
  );

  await emitDomainEvent({
    tenantId: input.tenantId,
    clientId: input.clientId ?? null,
    module: "engine",
    type: error ? "engine.action.failed" : "engine.action.executed",
    sourceType: "engine_execution",
    sourceId: execution.id,
    payload: eventPayload(input, execution.status)
  });

  return { ok: !error, execution, result, error };
}

/**
 * Registra uma execução cujo efeito já aconteceu fora do executor (ex.: rotas legadas
 * do creator/chat que aplicam na Meta por conta própria). Mantém o log unificado sem
 * forçar a migração síncrona de todos os chamadores.
 */
export async function recordExternalExecution(
  input: EngineActionInput & { ok: boolean; result?: Record<string, unknown> | null; error?: string | null }
): Promise<EngineExecution | null> {
  try {
    const { engineExecution: repo } = await repositories();
    const execution = await repo.save(
      repo.create({
        ...baseColumns(input),
        status: input.ok ? "executed" : "failed",
        result: input.result ?? null,
        error: input.error ?? null,
        executedAt: input.ok ? new Date() : null
      })
    );
    await emitDomainEvent({
      tenantId: input.tenantId,
      clientId: input.clientId ?? null,
      module: "engine",
      type: input.ok ? "engine.action.executed" : "engine.action.failed",
      sourceType: "engine_execution",
      sourceId: execution.id,
      payload: eventPayload(input, execution.status)
    });
    return execution;
  } catch (err) {
    console.error("[engine] recordExternalExecution failed", err);
    return null;
  }
}

/** Enfileira a ação para aprovação humana (status `pending` — a antiga fila de pendências). */
export async function enqueueApproval(input: EngineActionInput): Promise<EngineExecution> {
  const { engineExecution: repo } = await repositories();
  const execution = await repo.save(
    repo.create({ ...baseColumns(input), status: "pending" })
  );
  await emitDomainEvent({
    tenantId: input.tenantId,
    clientId: input.clientId ?? null,
    module: "engine",
    type: "engine.action.pending",
    sourceType: "engine_execution",
    sourceId: execution.id,
    payload: eventPayload(input, "pending")
  });
  return execution;
}

/**
 * Aprova uma pendência: executa o efeito real agora e fecha a linha como `executed`.
 * Se a execução falhar, a pendência PERMANECE `pending` (o usuário pode tentar de novo)
 * — mesmo contrato da rota antiga, que respondia 502 sem consumir a pendência.
 */
export async function approveExecution(args: {
  tenantId: string;
  executionId: string;
  userId: string;
  metaAccessToken: string;
}): Promise<
  | { ok: true; execution: EngineExecution; result?: Record<string, unknown> }
  | { ok: false; code: "not_found" | "already_resolved" | "execution_failed"; error: string }
> {
  const { engineExecution: repo } = await repositories();
  const execution = await repo.findOne({
    where: { id: args.executionId, tenantId: args.tenantId }
  });
  if (!execution) return { ok: false, code: "not_found", error: "Pendência não encontrada" };
  if (execution.status !== "pending") {
    return { ok: false, code: "already_resolved", error: "Pendência já foi resolvida" };
  }

  let result: Record<string, unknown>;
  try {
    result = await performEngineAction(args.metaAccessToken, execution);
  } catch (err) {
    return {
      ok: false,
      code: "execution_failed",
      error: err instanceof Error ? err.message : "Falha ao executar na Meta"
    };
  }

  execution.status = "executed";
  execution.result = result;
  execution.approvedBy = args.userId;
  execution.approvedAt = new Date();
  execution.executedAt = new Date();
  await repo.save(execution);

  await emitDomainEvent({
    tenantId: args.tenantId,
    clientId: execution.clientId ?? null,
    module: "engine",
    type: "engine.action.approved",
    sourceType: "engine_execution",
    sourceId: execution.id,
    payload: eventPayload(execution, "executed")
  });

  return { ok: true, execution, result };
}

/** Rejeita uma pendência — nada é executado. */
export async function rejectExecution(args: {
  tenantId: string;
  executionId: string;
  userId: string;
  reason?: string | null;
}): Promise<
  | { ok: true; execution: EngineExecution }
  | { ok: false; code: "not_found" | "already_resolved"; error: string }
> {
  const { engineExecution: repo } = await repositories();
  const execution = await repo.findOne({
    where: { id: args.executionId, tenantId: args.tenantId }
  });
  if (!execution) return { ok: false, code: "not_found", error: "Pendência não encontrada" };
  if (execution.status !== "pending") {
    return { ok: false, code: "already_resolved", error: "Pendência já foi resolvida" };
  }

  execution.status = "rejected";
  execution.approvedBy = args.userId;
  execution.approvedAt = new Date();
  execution.rejectionReason = args.reason?.trim() || null;
  await repo.save(execution);

  await emitDomainEvent({
    tenantId: args.tenantId,
    clientId: execution.clientId ?? null,
    module: "engine",
    type: "engine.action.rejected",
    sourceType: "engine_execution",
    sourceId: execution.id,
    payload: eventPayload(execution, "rejected")
  });

  return { ok: true, execution };
}

function baseColumns(input: EngineActionInput) {
  return {
    tenantId: input.tenantId,
    clientId: input.clientId ?? null,
    source: input.source,
    sourceId: input.sourceId ?? null,
    automationRuleId: input.automationRuleId ?? null,
    metaCampaignId: input.metaCampaignId ?? null,
    campaignName: input.campaignName ?? null,
    actionType: input.actionType,
    payload: input.payload ?? null,
    description: input.description
  };
}

function eventPayload(
  input: Pick<EngineActionInput, "actionType" | "metaCampaignId" | "automationRuleId" | "source">,
  status: string
): Record<string, unknown> {
  return {
    actionType: input.actionType,
    metaCampaignId: input.metaCampaignId ?? null,
    automationRuleId: input.automationRuleId ?? null,
    source: input.source,
    status
  };
}
