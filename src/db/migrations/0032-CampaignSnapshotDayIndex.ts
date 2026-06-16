import type { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignSnapshotDayIndex1735830200000 implements MigrationInterface {
  name = "CampaignSnapshotDayIndex1735830200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_metrics_account_day
      ON campaign_metric_snapshots ("adAccountId", day);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_metric_snapshots_account_day
      ON metric_snapshots ("adAccountId", day);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_campaign_metrics_account_day;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_metric_snapshots_account_day;`);
  }
}
