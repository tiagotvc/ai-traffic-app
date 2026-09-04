import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantMemberGoogleTableColumns1739200400000 implements MigrationInterface {
  name = "TenantMemberGoogleTableColumns1739200400000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS "googleTableColumns" jsonb NULL`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenant_members DROP COLUMN IF EXISTS "googleTableColumns"`);
  }
}
