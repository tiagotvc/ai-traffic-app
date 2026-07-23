import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fila de recomendações de palavras-chave do Google Ads (silo Google, ancorada em
 * clientId). Produzida pelo motor determinístico; idempotente por (clientId,
 * dedupeKey). Não toca em nenhuma tabela do Meta.
 */
export class GoogleKeywordRecommendations1735833700000 implements MigrationInterface {
  name = "GoogleKeywordRecommendations1735833700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS google_keyword_recommendations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        "customerId" text NOT NULL,
        "actionType" text NOT NULL,
        "campaignId" text,
        "campaignName" text,
        "adGroupId" text,
        "adGroupName" text,
        "criterionId" text,
        "keywordText" text NOT NULL,
        "matchType" text,
        signals jsonb,
        score numeric(6,4) NOT NULL DEFAULT 0,
        confidence numeric(6,4) NOT NULL DEFAULT 0,
        source text NOT NULL DEFAULT 'rule',
        intent jsonb NOT NULL,
        "ruleJustification" text,
        "aiJustification" text,
        status text NOT NULL DEFAULT 'PENDING',
        "autoApplyEligible" boolean NOT NULL DEFAULT false,
        "engineExecutionId" uuid,
        "dedupeKey" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_google_keyword_rec_client_dedupe"
      ON google_keyword_recommendations ("clientId", "dedupeKey");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_google_keyword_rec_tenant_client_status"
      ON google_keyword_recommendations ("tenantId", "clientId", status, "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS google_keyword_recommendations;`);
  }
}
