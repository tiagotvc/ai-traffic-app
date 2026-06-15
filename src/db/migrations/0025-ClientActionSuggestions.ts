import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientActionSuggestions_1735692200000 implements MigrationInterface {
  name = "ClientActionSuggestions_1735692200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = (await queryRunner.query(`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'client_action_suggestions'
      LIMIT 1
    `)) as unknown[];

    if (existing.length > 0) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE client_action_suggestions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "metaCampaignId" text,
        "linkedLearningId" uuid,
        title text NOT NULL,
        description text NOT NULL,
        "actionType" text NOT NULL,
        "actionPayload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        source text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        evidence jsonb,
        "dedupeKey" text,
        "resolvedByUserId" uuid,
        "resolvedAt" timestamptz,
        "resolutionNote" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_action_suggestions_tenant_client_created"
        ON client_action_suggestions ("tenantId", "clientId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_action_suggestions_tenant_client_status"
        ON client_action_suggestions ("tenantId", "clientId", status);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_client_action_suggestions_dedupe"
        ON client_action_suggestions ("tenantId", "clientId", "dedupeKey")
        WHERE "dedupeKey" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS client_action_suggestions;`);
  }
}
