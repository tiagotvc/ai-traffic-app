import type { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignTypeDefinitions1735830300000 implements MigrationInterface {
  name = "CampaignTypeDefinitions1735830300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campaign_type_definitions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        name text NOT NULL,
        metrics jsonb NOT NULL DEFAULT '[]',
        "createdByUserId" uuid NOT NULL,
        shared boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_campaign_type_definitions_tenant
        ON campaign_type_definitions ("tenantId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS campaign_type_definitions;`);
  }
}
