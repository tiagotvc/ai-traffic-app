import { MigrationInterface, QueryRunner } from "typeorm";

export class AutomationExecutionModes_1735833000000 implements MigrationInterface {
  name = "AutomationExecutionModes_1735833000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "executionMode" text NOT NULL DEFAULT 'auto';

      CREATE TABLE IF NOT EXISTS "automation_pending_actions" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "automationRuleId" uuid NOT NULL REFERENCES "automation_rules"("id") ON DELETE CASCADE,
        "clientId" uuid NULL,
        "metaCampaignId" text NOT NULL,
        "campaignName" text NULL,
        "actionType" text NOT NULL,
        "budgetPercent" numeric(10,2) NULL,
        "description" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "approvedBy" uuid NULL,
        "approvedAt" timestamptz NULL,
        "rejectionReason" text NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_automation_pending_tenant_status" ON "automation_pending_actions" ("tenantId", "status", "createdAt");
      CREATE INDEX IF NOT EXISTS "idx_automation_pending_rule" ON "automation_pending_actions" ("automationRuleId");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "automation_pending_actions";
      ALTER TABLE "automation_rules" DROP COLUMN IF EXISTS "executionMode";
    `);
  }
}
