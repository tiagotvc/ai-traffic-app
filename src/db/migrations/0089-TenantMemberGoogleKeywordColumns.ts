import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantMemberGoogleKeywordColumns1739200300000 implements MigrationInterface {
  name = "TenantMemberGoogleKeywordColumns1739200300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS "googleKeywordColumns" jsonb NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenant_members DROP COLUMN IF EXISTS "googleKeywordColumns"`);
  }
}
