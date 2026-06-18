import type { MigrationInterface, QueryRunner } from "typeorm";

/** Garante coluna defaultUtm caso 0037 não tenha sido aplicada no ambiente. */
export class ClientMetaSettingsDefaultUtm1735830800000 implements MigrationInterface {
  name = "ClientMetaSettingsDefaultUtm1735830800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
        ADD COLUMN IF NOT EXISTS "defaultUtm" jsonb NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings DROP COLUMN IF EXISTS "defaultUtm";
    `);
  }
}
