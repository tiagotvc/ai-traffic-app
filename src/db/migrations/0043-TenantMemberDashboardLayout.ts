import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantMemberDashboardLayout_1735831300000 implements MigrationInterface {
  name = "TenantMemberDashboardLayout_1735831300000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_members"
        ADD COLUMN IF NOT EXISTS "dashboardLayout" jsonb NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_members"
        DROP COLUMN IF EXISTS "dashboardLayout"
    `);
  }
}
