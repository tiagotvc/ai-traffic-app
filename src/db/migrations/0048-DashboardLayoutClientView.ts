import { MigrationInterface, QueryRunner } from "typeorm";

export class DashboardLayoutClientView_1735831800000 implements MigrationInterface {
  name = "DashboardLayoutClientView_1735831800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dashboard_layouts"
        ADD COLUMN IF NOT EXISTS "clientId" uuid NULL,
        ADD COLUMN IF NOT EXISTS "published" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "publishedAt" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "viewToken" text NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dashboard_layouts_viewToken"
        ON "dashboard_layouts" ("viewToken")
        WHERE "viewToken" IS NOT NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "dashboard_layouts"
          ADD CONSTRAINT "FK_dashboard_layouts_client"
          FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dashboard_layouts"
        DROP CONSTRAINT IF EXISTS "FK_dashboard_layouts_client"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_dashboard_layouts_viewToken"
    `);
    await queryRunner.query(`
      ALTER TABLE "dashboard_layouts"
        DROP COLUMN IF EXISTS "viewToken",
        DROP COLUMN IF EXISTS "publishedAt",
        DROP COLUMN IF EXISTS "published",
        DROP COLUMN IF EXISTS "clientId"
    `);
  }
}
