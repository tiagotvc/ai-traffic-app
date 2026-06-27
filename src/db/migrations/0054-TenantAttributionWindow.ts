import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantAttributionWindow_1735832400000 implements MigrationInterface {
  name = "TenantAttributionWindow_1735832400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "attributionWindow" text NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "attributionWindow"`);
  }
}
