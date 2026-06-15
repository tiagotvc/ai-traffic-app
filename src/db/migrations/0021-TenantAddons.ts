import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantAddons_1735691800000 implements MigrationInterface {
  name = "TenantAddons_1735691800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_addons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL UNIQUE,
        "extraClients" int NOT NULL DEFAULT 0,
        "extraAdAccounts" int NOT NULL DEFAULT 0,
        "extraMembers" int NOT NULL DEFAULT 0,
        "extraAutomationRules" int NOT NULL DEFAULT 0,
        "extraAiRequestsPerMonth" int NOT NULL DEFAULT 0,
        "extraScheduledReports" int NOT NULL DEFAULT 0,
        "adminNote" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenant_addons_tenant"
        ON tenant_addons ("tenantId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_addons;`);
  }
}
