import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Opção B (silo Google): snapshots diários de campanha do Google Ads, separados
 * das tabelas do Meta (ancorados em clientId, não em ad_accounts). Não toca em
 * nenhuma tabela/índice do Meta.
 */
export class GoogleCampaignSnapshots1735833600000 implements MigrationInterface {
  name = "GoogleCampaignSnapshots1735833600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS google_campaign_metric_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        "customerId" text NOT NULL,
        "campaignId" text NOT NULL,
        "campaignName" text,
        status text,
        "channelType" text,
        day date NOT NULL,
        impressions bigint NOT NULL DEFAULT 0,
        clicks bigint NOT NULL DEFAULT 0,
        cost numeric(18,2) NOT NULL DEFAULT 0,
        conversions numeric(18,2) NOT NULL DEFAULT 0,
        "conversionsValue" numeric(18,2) NOT NULL DEFAULT 0,
        ctr numeric(10,4) NOT NULL DEFAULT 0,
        "averageCpc" numeric(18,4) NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_google_campaign_snapshot_client_campaign_day"
      ON google_campaign_metric_snapshots ("clientId", "campaignId", day);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS google_campaign_metric_snapshots;`);
  }
}
