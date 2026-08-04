import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Memória multi-turn persistida do chat do Orion Commander — uma linha por
 * (tenantId, clientId), compartilhada no tenant.
 */
export class CommanderConversations_1735980000000 implements MigrationInterface {
  name = "CommanderConversations_1735980000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commander_conversations" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "messages" jsonb NOT NULL DEFAULT '[]'::jsonb
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_commander_conversations_tenant_client"
      ON "commander_conversations" ("tenantId", "clientId");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "commander_conversations";`);
  }
}
