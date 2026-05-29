import { MigrationInterface, QueryRunner } from "typeorm";

export class GoalsAndCampaignMetrics1735690000000 implements MigrationInterface {
  name = "GoalsAndCampaignMetrics1735690000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_goals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "clientId" uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
        objective text NOT NULL DEFAULT 'leads',
        "maxCpl" numeric(18,4) NULL,
        "maxCpa" numeric(18,4) NULL,
        "maxCpc" numeric(18,4) NULL,
        "minCtr" numeric(10,4) NULL,
        "minRoas" numeric(18,4) NULL,
        "maxSpendWithoutConversion" numeric(18,2) NULL,
        "budgetAlertPercent" numeric(5,2) NULL,
        "windowDays" int NOT NULL DEFAULT 1,
        enabled boolean NOT NULL DEFAULT true
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campaign_goals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        "adAccountId" uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
        "metaCampaignId" text NOT NULL,
        "maxCpl" numeric(18,4) NULL,
        "maxCpa" numeric(18,4) NULL,
        "maxCpc" numeric(18,4) NULL,
        "minCtr" numeric(10,4) NULL,
        "minRoas" numeric(18,4) NULL,
        "maxSpendWithoutConversion" numeric(18,2) NULL,
        "budgetAlertPercent" numeric(5,2) NULL,
        "windowDays" int NULL,
        enabled boolean NOT NULL DEFAULT true,
        CONSTRAINT campaign_goals_unique UNIQUE ("clientId", "metaCampaignId")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campaign_metric_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "adAccountId" uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
        "metaCampaignId" text NOT NULL,
        "campaignName" text NULL,
        day date NOT NULL,
        spend numeric(18,2) NOT NULL DEFAULT 0,
        impressions bigint NOT NULL DEFAULT 0,
        clicks bigint NOT NULL DEFAULT 0,
        ctr numeric(10,4) NOT NULL DEFAULT 0,
        cpc numeric(18,4) NOT NULL DEFAULT 0,
        conversions bigint NOT NULL DEFAULT 0,
        leads bigint NOT NULL DEFAULT 0,
        roas numeric(18,4) NOT NULL DEFAULT 0,
        "dailyBudget" numeric(18,2) NULL,
        CONSTRAINT campaign_metric_snapshots_unique UNIQUE ("adAccountId", "metaCampaignId", day)
      );
    `);

    await queryRunner.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "metaCampaignId" text NULL;`);
    await queryRunner.query(
      `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'critical';`
    );
    await queryRunner.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "metricKey" text NULL;`);
    await queryRunner.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "actualValue" numeric(18,4) NULL;`);
    await queryRunner.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "thresholdValue" numeric(18,4) NULL;`);
    await queryRunner.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "dedupDay" date NULL;`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS alerts_dedup_idx
      ON alerts ("tenantId", type, "clientId", "metaCampaignId", "dedupDay");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS alerts_dedup_idx;`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS "dedupDay";`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS "thresholdValue";`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS "actualValue";`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS "metricKey";`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS severity;`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS "metaCampaignId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaign_metric_snapshots;`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaign_goals;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_goals;`);
  }
}
