import { MigrationInterface, QueryRunner } from "typeorm";

export class ReportScheduleParams_1735832700000 implements MigrationInterface {
  name = "ReportScheduleParams_1735832700000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "report_schedules"
        ADD COLUMN IF NOT EXISTS "deliveryChannel" text NOT NULL DEFAULT 'email_pdf',
        ADD COLUMN IF NOT EXISTS "reportType" text NOT NULL DEFAULT 'simple',
        ADD COLUMN IF NOT EXISTS "periodPreset" text NULL,
        ADD COLUMN IF NOT EXISTS "recipientPhone" text NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "report_schedules"
        DROP COLUMN IF EXISTS "deliveryChannel",
        DROP COLUMN IF EXISTS "reportType",
        DROP COLUMN IF EXISTS "periodPreset",
        DROP COLUMN IF EXISTS "recipientPhone"
    `);
  }
}
