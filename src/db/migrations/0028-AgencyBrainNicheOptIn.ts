import type { MigrationInterface, QueryRunner } from "typeorm";

export class AgencyBrainNicheOptIn_1735692500000 implements MigrationInterface {
  name = "AgencyBrainNicheOptIn_1735692500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS "agencyBrainNicheShareOptIn" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      UPDATE plans
      SET limits = limits || '{
        "allowAgencyBrainTimeline": true,
        "allowAgencyBrainExperiments": true,
        "allowAgencyBrainActionPlans": true,
        "allowAgencyBrainChat": true
      }'::jsonb
      WHERE slug IN ('advanced', 'agency', 'pro');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants DROP COLUMN IF EXISTS "agencyBrainNicheShareOptIn";
    `);
  }
}
