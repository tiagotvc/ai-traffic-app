import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientLinkedMetaPixelIds1735832200000 implements MigrationInterface {
  name = "ClientLinkedMetaPixelIds1735832200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
      ADD COLUMN IF NOT EXISTS "linkedMetaPixelIds" jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings DROP COLUMN IF EXISTS "linkedMetaPixelIds";
    `);
  }
}
