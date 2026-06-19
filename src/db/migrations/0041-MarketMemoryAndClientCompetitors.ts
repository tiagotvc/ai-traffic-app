import type { MigrationInterface, QueryRunner } from "typeorm";

export class MarketMemoryAndClientCompetitors1735831100000 implements MigrationInterface {
  name = "MarketMemoryAndClientCompetitors1735831100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS "marketCountry" text,
      ADD COLUMN IF NOT EXISTS competitors jsonb NOT NULL DEFAULT '[]'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS market_memories (
        id uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        niche text,
        "marketCountry" text,
        "patternsJson" jsonb NOT NULL DEFAULT '[]',
        "rawStatsJson" jsonb NOT NULL DEFAULT '{}',
        "coverageLevel" text NOT NULL DEFAULT 'empty',
        "adsAnalyzed" int NOT NULL DEFAULT 0,
        "competitorsScanned" int NOT NULL DEFAULT 0,
        "fetchedAt" timestamptz NOT NULL DEFAULT now(),
        "expiresAt" timestamptz NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_market_memories_tenant_client"
      ON market_memories ("tenantId", "clientId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS market_memories`);
    await queryRunner.query(`
      ALTER TABLE clients
      DROP COLUMN IF EXISTS "marketCountry",
      DROP COLUMN IF EXISTS competitors
    `);
  }
}
