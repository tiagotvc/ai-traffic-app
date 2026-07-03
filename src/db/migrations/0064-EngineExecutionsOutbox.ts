import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fase 1 da arquitetura Orion (docs/orion-architecture): log unificado de execução do
 * Engine (`engine_executions`, absorvendo a fila `automation_pending_actions`) e o
 * outbox do ecossistema (`domain_events`). A tabela antiga é mantida (deprecada, sem
 * novas escritas) — drop só numa migration futura, após validação em produção.
 */
export class EngineExecutionsOutbox_1735833400000 implements MigrationInterface {
  name = "EngineExecutionsOutbox_1735833400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engine_executions" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NULL,
        "source" text NOT NULL,
        "sourceId" text NULL,
        "automationRuleId" uuid NULL,
        "metaCampaignId" text NULL,
        "campaignName" text NULL,
        "actionType" text NOT NULL,
        "payload" jsonb NULL,
        "description" text NOT NULL,
        "status" text NOT NULL DEFAULT 'executed',
        "result" jsonb NULL,
        "error" text NULL,
        "approvedBy" uuid NULL,
        "approvedAt" timestamptz NULL,
        "rejectionReason" text NULL,
        "executedAt" timestamptz NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_engine_exec_tenant_status" ON "engine_executions" ("tenantId", "status", "createdAt");
      CREATE INDEX IF NOT EXISTS "idx_engine_exec_tenant_source" ON "engine_executions" ("tenantId", "source", "createdAt");
      CREATE INDEX IF NOT EXISTS "idx_engine_exec_rule" ON "engine_executions" ("automationRuleId");

      CREATE TABLE IF NOT EXISTS "domain_events" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NULL,
        "module" text NOT NULL,
        "type" text NOT NULL,
        "payload" jsonb NULL,
        "sourceType" text NULL,
        "sourceId" text NULL,
        "processedAt" timestamptz NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_domain_events_tenant" ON "domain_events" ("tenantId", "createdAt");
      CREATE INDEX IF NOT EXISTS "idx_domain_events_type" ON "domain_events" ("module", "type", "createdAt");

      -- Copia a fila antiga preservando ids (idempotente via ON CONFLICT):
      -- 'approved' na fila antiga significava "aprovado E executado" → vira 'executed'.
      INSERT INTO "engine_executions" (
        "id", "createdAt", "updatedAt", "tenantId", "clientId", "source", "sourceId",
        "automationRuleId", "metaCampaignId", "campaignName", "actionType", "payload",
        "description", "status", "approvedBy", "approvedAt", "rejectionReason", "executedAt"
      )
      SELECT
        p."id", p."createdAt", p."updatedAt", p."tenantId", p."clientId", 'rule', p."automationRuleId"::text,
        p."automationRuleId", p."metaCampaignId", p."campaignName", p."actionType",
        CASE WHEN p."budgetPercent" IS NULL THEN NULL ELSE jsonb_build_object('budgetPercent', p."budgetPercent") END,
        p."description",
        CASE p."status" WHEN 'approved' THEN 'executed' ELSE p."status" END,
        p."approvedBy", p."approvedAt", p."rejectionReason",
        CASE WHEN p."status" = 'approved' THEN p."approvedAt" ELSE NULL END
      FROM "automation_pending_actions" p
      ON CONFLICT ("id") DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "domain_events";
      DROP TABLE IF EXISTS "engine_executions";
    `);
  }
}
