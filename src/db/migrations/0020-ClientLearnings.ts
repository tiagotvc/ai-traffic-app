import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientLearnings_1735691700000 implements MigrationInterface {
  name = "ClientLearnings_1735691700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_learnings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "metaCampaignId" text,
        "metaAdId" text,
        "creativeAssetId" uuid,
        title text NOT NULL,
        description text NOT NULL,
        category text NOT NULL,
        impact text NOT NULL DEFAULT 'MEDIUM',
        confidence text NOT NULL DEFAULT 'MEDIUM',
        source text NOT NULL,
        status text NOT NULL DEFAULT 'APPROVED',
        tags jsonb NOT NULL DEFAULT '[]'::jsonb,
        "metricSnapshot" jsonb,
        evidence jsonb,
        "createdByUserId" uuid,
        "dedupeKey" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_learnings_tenant_client_created"
        ON client_learnings ("tenantId", "clientId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_learnings_tenant_client_status"
        ON client_learnings ("tenantId", "clientId", status);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_client_learnings_dedupe"
        ON client_learnings ("tenantId", "clientId", "dedupeKey")
        WHERE "dedupeKey" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS client_learnings;`);
  }
}
