import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fundação do Orion Research (docs/orion-research): tabela genérica de achados que
 * desacopla o Cortex das fontes de pesquisa — fontes novas plugam sem migration.
 */
export class ResearchFindings_1735833800000 implements MigrationInterface {
  name = "ResearchFindings_1735833800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_findings" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NULL,
        "source" text NOT NULL,
        "category" text NOT NULL,
        "entity" text NOT NULL,
        "title" text NULL,
        "summary" text NOT NULL,
        "confidence" numeric(5,2) NULL,
        "evidence" jsonb NULL,
        "researchJobId" uuid NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_research_findings_tenant" ON "research_findings" ("tenantId", "createdAt");
      CREATE INDEX IF NOT EXISTS "idx_research_findings_source" ON "research_findings" ("tenantId", "source", "createdAt");
      CREATE INDEX IF NOT EXISTS "idx_research_findings_entity" ON "research_findings" ("tenantId", "entity", "createdAt");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "research_findings";`);
  }
}
