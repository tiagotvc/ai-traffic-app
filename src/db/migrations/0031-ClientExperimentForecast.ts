import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientExperimentForecast1735830100000 implements MigrationInterface {
  name = "ClientExperimentForecast1735830100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_experiments
      ADD COLUMN IF NOT EXISTS "metaCampaignId" text NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE client_experiments
      ADD COLUMN IF NOT EXISTS "horizonDays" int NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE client_experiments
      ADD COLUMN IF NOT EXISTS "baselineForecast" jsonb NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE client_experiments
      ADD COLUMN IF NOT EXISTS "actualMetrics" jsonb NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE client_experiments DROP COLUMN IF EXISTS "actualMetrics";`);
    await queryRunner.query(`ALTER TABLE client_experiments DROP COLUMN IF EXISTS "baselineForecast";`);
    await queryRunner.query(`ALTER TABLE client_experiments DROP COLUMN IF EXISTS "horizonDays";`);
    await queryRunner.query(`ALTER TABLE client_experiments DROP COLUMN IF EXISTS "metaCampaignId";`);
  }
}
