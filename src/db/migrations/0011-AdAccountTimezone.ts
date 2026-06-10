import type { MigrationInterface, QueryRunner } from "typeorm";

export class AdAccountTimezone1735690800000 implements MigrationInterface {
  name = "AdAccountTimezone1735690800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE meta_ad_account_inventory
        ADD COLUMN IF NOT EXISTS "timezone" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE meta_ad_account_inventory DROP COLUMN IF EXISTS "timezone";`
    );
  }
}
