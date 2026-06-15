import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientMetaSettingsDashboardPrefs_1735691900000 implements MigrationInterface {
  name = "ClientMetaSettingsDashboardPrefs_1735691900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
        ADD COLUMN IF NOT EXISTS "defaultDashboardMetrics" jsonb NULL
          DEFAULT '["spend","conversions"]'::jsonb;
    `);

    await queryRunner.query(`
      ALTER TABLE client_meta_settings
        ADD COLUMN IF NOT EXISTS "defaultClientMetric" text NULL
          DEFAULT 'roas';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
        DROP COLUMN IF EXISTS "defaultDashboardMetrics";
    `);

    await queryRunner.query(`
      ALTER TABLE client_meta_settings
        DROP COLUMN IF EXISTS "defaultClientMetric";
    `);
  }
}
