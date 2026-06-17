import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantWebhooks_1735830600000 implements MigrationInterface {
  name = "TenantWebhooks_1735830600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS "webhookAlertUrl" text NULL,
      ADD COLUMN IF NOT EXISTS "webhookReportUrl" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      DROP COLUMN IF EXISTS "webhookAlertUrl",
      DROP COLUMN IF EXISTS "webhookReportUrl";
    `);
  }
}
