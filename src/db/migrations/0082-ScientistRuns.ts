import { MigrationInterface, QueryRunner } from "typeorm";

/** Log de execução dos Scientists — base do histórico por cientista em /commander/scientists. */
export class ScientistRuns_1736010000000 implements MigrationInterface {
  name = "ScientistRuns_1736010000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scientist_runs" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid,
        "scientistId" text NOT NULL,
        "ran" boolean NOT NULL,
        "reason" text,
        "itemsAnalyzed" int,
        "findings" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "sources" jsonb,
        "summary" text,
        "confidence" int
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scientist_runs_tenant_scientist_created"
      ON "scientist_runs" ("tenantId", "scientistId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scientist_runs_tenant_client_created"
      ON "scientist_runs" ("tenantId", "clientId", "createdAt");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scientist_runs";`);
  }
}
