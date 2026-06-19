import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientSavedTargeting1735831200000 implements MigrationInterface {
  name = "ClientSavedTargeting1735831200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_saved_targeting (
        id uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "metaAdAccountId" text NOT NULL,
        name text NOT NULL,
        targeting jsonb NOT NULL,
        "metaSavedAudienceId" text
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_saved_targeting_lookup"
      ON client_saved_targeting ("tenantId", "clientId", "metaAdAccountId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS client_saved_targeting`);
  }
}
