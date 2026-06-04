import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantMetaConnection1735690700000 implements MigrationInterface {
  name = "TenantMetaConnection1735690700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS "metaConnectionUserId" uuid NULL
        REFERENCES users(id) ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS "metaConnectionUserId";`);
  }
}
