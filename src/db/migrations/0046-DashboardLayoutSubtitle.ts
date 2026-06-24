import { MigrationInterface, QueryRunner } from "typeorm";

export class DashboardLayoutSubtitle_1735831600000 implements MigrationInterface {
  name = "DashboardLayoutSubtitle_1735831600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dashboard_layouts"
        ADD COLUMN IF NOT EXISTS "subtitle" text NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dashboard_layouts"
        DROP COLUMN IF EXISTS "subtitle"
    `);
  }
}
