import { MigrationInterface, QueryRunner } from "typeorm";

/** Histórico de gerações do Estúdio Criativo + biblioteca comunitária compartilhada. */
export class CreativeLibraryItems_1739000000000 implements MigrationInterface {
  name = "CreativeLibraryItems_1739000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "creative_library_items" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid,
        "createdByUserId" uuid,
        "headline" text NOT NULL,
        "body" text NOT NULL,
        "format" text NOT NULL,
        "style" text NOT NULL,
        "mimeType" text NOT NULL,
        "imageData" bytea NOT NULL,
        "visibility" text NOT NULL DEFAULT 'private',
        "sharedAt" timestamptz,
        "sourceItemId" uuid,
        "usedInDraftId" uuid
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_creative_library_items_tenant_created"
      ON "creative_library_items" ("tenantId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_creative_library_items_visibility_created"
      ON "creative_library_items" ("visibility", "createdAt");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "creative_library_items";`);
  }
}
