import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientCommercialAddressNormalized1735831700000 implements MigrationInterface {
  name = "ClientCommercialAddressNormalized1735831700000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
      ADD COLUMN IF NOT EXISTS "commercialAddressNormalized" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
      DROP COLUMN IF EXISTS "commercialAddressNormalized"
    `);
  }
}
