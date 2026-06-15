import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantMemberDashboardPrefs_1735692000000 implements MigrationInterface {
  name = "TenantMemberDashboardPrefs_1735692000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenant_members
        ADD COLUMN IF NOT EXISTS "dashboardChartMetrics" jsonb NULL
          DEFAULT '["spend","conversions"]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenant_members
        DROP COLUMN IF EXISTS "dashboardChartMetrics";
    `);
  }
}
