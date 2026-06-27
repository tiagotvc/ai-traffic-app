import { MigrationInterface, QueryRunner } from "typeorm";

export class McpTokens_1735832300000 implements MigrationInterface {
  name = "McpTokens_1735832300000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mcp_tokens" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "tokenHash" text NOT NULL,
        "label" text NULL,
        "lastUsedAt" timestamptz NULL,
        "revokedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_mcp_tokens_token_hash"
        ON "mcp_tokens" ("tokenHash")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_mcp_tokens_tenant"
        ON "mcp_tokens" ("tenantId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mcp_tokens"`);
  }
}
