import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantMemberCampaignTableLayouts1735830400000 implements MigrationInterface {
  name = "TenantMemberCampaignTableLayouts1735830400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenant_members
        ADD COLUMN IF NOT EXISTS "campaignTableLayouts" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "activeCampaignTableLayoutId" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenant_members
        DROP COLUMN IF EXISTS "campaignTableLayouts",
        DROP COLUMN IF EXISTS "activeCampaignTableLayoutId";
    `);
  }
}
