import type { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignPresets1735691000000 implements MigrationInterface {
  name = "CampaignPresets1735691000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campaign_presets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "metaCampaignId" text NOT NULL,
        preset text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("tenantId", "metaCampaignId")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_campaign_presets_tenant ON campaign_presets("tenantId");`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS campaign_presets;`);
  }
}
