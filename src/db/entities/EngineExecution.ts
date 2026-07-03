import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

/** Quem pediu a ação: motor de regras, chat do Brain/Commander, criador de campanha, workflow (futuro). */
export type EngineExecutionSource = "rule" | "chat" | "creator" | "workflow";

/**
 * `pending` = aguardando aprovação humana (a antiga fila de `automation_pending_actions`);
 * `executed`/`failed` = resultado da execução real; `rejected` = recusada na fila.
 */
export type EngineExecutionStatus = "pending" | "rejected" | "executed" | "failed";

export type EngineActionType =
  | "pause_campaign"
  | "reactivate_campaign"
  | "adjust_budget_percent"
  | "scale_gradual_step"
  | "scale_budget"
  | "notify_email"
  | "meta_apply";

/**
 * Log unificado de execução do Orion Engine — toda ação com efeito externo (Meta, e-mail)
 * passa a viver aqui, independentemente de quem pediu (regra, chat, criador, workflow).
 * Absorve a fila de aprovação: uma pendência é uma execução em `status: "pending"`.
 * Sem FK para `automation_rules` de propósito: o histórico de execução sobrevive à
 * exclusão da regra (auditoria > cascade).
 */
@Entity({ name: "engine_executions" })
@Index(["tenantId", "status", "createdAt"])
@Index(["tenantId", "source", "createdAt"])
@Index(["automationRuleId"])
export class EngineExecution extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "text" })
  source!: EngineExecutionSource;

  /** Id do artefato de origem (suggestionId, recommendationId, workflowStepId…). */
  @Column({ type: "text", nullable: true })
  sourceId?: string | null;

  @Column({ type: "uuid", nullable: true })
  automationRuleId?: string | null;

  @Column({ type: "text", nullable: true })
  metaCampaignId?: string | null;

  @Column({ type: "text", nullable: true })
  campaignName?: string | null;

  @Column({ type: "text" })
  actionType!: EngineActionType;

  /** Parâmetros da ação (budgetPercent, recipientEmail, targetId…). */
  @Column({ type: "jsonb", nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text", default: "executed" })
  status!: EngineExecutionStatus;

  /** Resultado da execução (orçamento antes/depois, detalhe da Meta…). */
  @Column({ type: "jsonb", nullable: true })
  result?: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  error?: string | null;

  @Column({ type: "uuid", nullable: true })
  approvedBy?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  approvedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  rejectionReason?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  executedAt?: Date | null;
}
