import type { MigrationInterface, QueryRunner } from "typeorm";

export class HistoricalBackfillQueue1735820000000 implements MigrationInterface {
  name = "HistoricalBackfillQueue1735820000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sync_runs
      ADD COLUMN IF NOT EXISTS "runType" text NOT NULL DEFAULT 'sync';
    `);

    await queryRunner.query(`
      ALTER TABLE sync_runs
      ADD COLUMN IF NOT EXISTS "depthDays" int NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE sync_runs
      ADD COLUMN IF NOT EXISTS "daysDone" int NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE sync_runs
      ADD COLUMN IF NOT EXISTS "daysTotal" int NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE tenant_sync_state
      ADD COLUMN IF NOT EXISTS "lastHistoricalBackfillAt" timestamptz NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE tenant_sync_state
      ADD COLUMN IF NOT EXISTS "historicalDepthDays" int NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sync_runs DROP COLUMN IF EXISTS "runType";
    `);

    await queryRunner.query(`
      ALTER TABLE sync_runs DROP COLUMN IF EXISTS "depthDays";
    `);

    await queryRunner.query(`
      ALTER TABLE sync_runs DROP COLUMN IF EXISTS "daysDone";
    `);

    await queryRunner.query(`
      ALTER TABLE sync_runs DROP COLUMN IF EXISTS "daysTotal";
    `);

    await queryRunner.query(`
      ALTER TABLE tenant_sync_state DROP COLUMN IF EXISTS "lastHistoricalBackfillAt";
    `);

    await queryRunner.query(`
      ALTER TABLE tenant_sync_state DROP COLUMN IF EXISTS "historicalDepthDays";
    `);
  }
}

