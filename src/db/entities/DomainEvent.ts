import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type DomainEventModule = "engine" | "laboratory" | "commander" | "brain";

/**
 * Outbox do ecossistema Orion — os módulos (Engine/Laboratory/Commander/Brain) se
 * comunicam por artefatos; esta tabela é o registro append-only desses artefatos.
 * Consumidores: projeções de UI (timeline), processamento assíncrono (Inngest) e o
 * export analítico para BigQuery. Nunca é lida em caminho síncrono de request.
 */
@Entity({ name: "domain_events" })
@Index(["tenantId", "createdAt"])
@Index(["module", "type", "createdAt"])
export class DomainEvent extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "text" })
  module!: DomainEventModule;

  /** Ex.: "engine.action.executed", "laboratory.learning.approved". */
  @Column({ type: "text" })
  type!: string;

  @Column({ type: "jsonb", nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  sourceType?: string | null;

  @Column({ type: "text", nullable: true })
  sourceId?: string | null;

  /** Marcado pelo consumidor assíncrono (ex.: export BQ) — null = ainda não processado. */
  @Column({ type: "timestamptz", nullable: true })
  processedAt?: Date | null;
}
