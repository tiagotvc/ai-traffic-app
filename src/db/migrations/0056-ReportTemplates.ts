import { MigrationInterface, QueryRunner } from "typeorm";

export class ReportTemplates_1735832600000 implements MigrationInterface {
  name = "ReportTemplates_1735832600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_templates" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "name" text NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_report_templates_tenant"
        ON "report_templates" ("tenantId", "createdAt" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "report_templates"`);
  }
}
