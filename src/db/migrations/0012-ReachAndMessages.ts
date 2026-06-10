import type { MigrationInterface, QueryRunner } from "typeorm";

export class ReachAndMessages1735690900000 implements MigrationInterface {
  name = "ReachAndMessages1735690900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE metric_snapshots
        ADD COLUMN IF NOT EXISTS "reach" bigint NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "messages" bigint NOT NULL DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE campaign_metric_snapshots
        ADD COLUMN IF NOT EXISTS "reach" bigint NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "messages" bigint NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE metric_snapshots
        DROP COLUMN IF EXISTS "reach",
        DROP COLUMN IF EXISTS "messages";
    `);
    await queryRunner.query(`
      ALTER TABLE campaign_metric_snapshots
        DROP COLUMN IF EXISTS "reach",
        DROP COLUMN IF EXISTS "messages";
    `);
  }
}
