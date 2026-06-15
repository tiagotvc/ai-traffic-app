import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantMemberClientMetricPref_1735692100000 implements MigrationInterface {
  name = "TenantMemberClientMetricPref_1735692100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenant_members
        ADD COLUMN IF NOT EXISTS "dashboardClientMetric" text NULL
          DEFAULT 'roas';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenant_members
        DROP COLUMN IF EXISTS "dashboardClientMetric";
    `);
  }
}
