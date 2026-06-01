import type { MigrationInterface, QueryRunner } from "typeorm";

export class ManagerFeatures1735690500000 implements MigrationInterface {
  name = "ManagerFeatures1735690500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "snoozedUntil" timestamptz NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "acknowledgedAt" timestamptz NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "acknowledgedBy" text NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NULL,
        name text NOT NULL,
        format text NOT NULL DEFAULT 'pdf',
        frequency text NOT NULL DEFAULT 'weekly',
        "dayOfWeek" int NULL,
        "hourUtc" int NOT NULL DEFAULT 12,
        recipients jsonb NOT NULL DEFAULT '[]',
        enabled bool NOT NULL DEFAULT true,
        "lastRunAt" timestamptz NULL,
        "nextRunAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_report_schedules_tenant ON report_schedules("tenantId");`
    );

    await queryRunner.query(`
      ALTER TABLE campaign_metric_snapshots ADD COLUMN IF NOT EXISTS "campaignStatus" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE campaign_metric_snapshots DROP COLUMN IF EXISTS "campaignStatus";`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS report_schedules;`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS "acknowledgedBy";`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS "acknowledgedAt";`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS "snoozedUntil";`);
  }
}
