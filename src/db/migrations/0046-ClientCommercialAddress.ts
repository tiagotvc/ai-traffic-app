import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientCommercialAddress1735831600000 implements MigrationInterface {
  name = "ClientCommercialAddress1735831600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
      ADD COLUMN IF NOT EXISTS "commercialAddress" text,
      ADD COLUMN IF NOT EXISTS "commercialLatitude" double precision,
      ADD COLUMN IF NOT EXISTS "commercialLongitude" double precision
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
      DROP COLUMN IF EXISTS "commercialAddress",
      DROP COLUMN IF EXISTS "commercialLatitude",
      DROP COLUMN IF EXISTS "commercialLongitude"
    `);
  }
}
