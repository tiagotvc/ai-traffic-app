import type { MigrationInterface, QueryRunner } from "typeorm";

export class AdMetricSnapshots1735830000000 implements MigrationInterface {
  name = "AdMetricSnapshots1735830000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ad_metric_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "adAccountId" uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
        "metaCampaignId" text NOT NULL,
        "metaAdsetId" text NOT NULL,
        "metaAdId" text NULL,
        "adsetName" text NULL,
        "adName" text NULL,
        day date NOT NULL,
        spend numeric(18,2) NOT NULL DEFAULT 0,
        impressions bigint NOT NULL DEFAULT 0,
        clicks bigint NOT NULL DEFAULT 0,
        ctr numeric(10,4) NOT NULL DEFAULT 0,
        cpc numeric(18,4) NOT NULL DEFAULT 0,
        conversions bigint NOT NULL DEFAULT 0,
        leads bigint NOT NULL DEFAULT 0,
        reach bigint NOT NULL DEFAULT 0,
        messages bigint NOT NULL DEFAULT 0,
        roas numeric(18,4) NOT NULL DEFAULT 0,
        CONSTRAINT ad_metric_snapshots_unique UNIQUE ("adAccountId", "metaAdsetId", "metaAdId", day)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_metrics_adset ON ad_metric_snapshots("metaAdsetId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_metrics_campaign ON ad_metric_snapshots("metaCampaignId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ad_metrics_campaign;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ad_metrics_adset;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ad_metric_snapshots;`);
  }
}
