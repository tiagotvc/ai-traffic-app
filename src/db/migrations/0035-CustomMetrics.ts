import type { MigrationInterface, QueryRunner } from "typeorm";

export class CustomMetrics1735830500000 implements MigrationInterface {
  name = "CustomMetrics1735830500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS custom_metrics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NULL,
        name text NOT NULL,
        formula text NOT NULL,
        format text NOT NULL DEFAULT 'number',
        "createdByUserId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_custom_metrics_tenant
        ON custom_metrics ("tenantId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS custom_metrics;`);
  }
}
