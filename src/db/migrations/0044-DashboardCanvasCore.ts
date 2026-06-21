import { MigrationInterface, QueryRunner } from "typeorm";

export class DashboardCanvasCore_1735831400000 implements MigrationInterface {
  name = "DashboardCanvasCore_1735831400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dashboard_layouts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "icon" text NULL,
        "sortOrder" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("tenantId", "userId", "slug")
      );
      CREATE INDEX IF NOT EXISTS "idx_dashboard_layouts_member"
        ON "dashboard_layouts" ("tenantId", "userId", "sortOrder");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dashboard_widget_instances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "layoutId" uuid NOT NULL REFERENCES "dashboard_layouts"("id") ON DELETE CASCADE,
        "widgetType" text NOT NULL,
        "title" text NULL,
        "x" int NOT NULL DEFAULT 0,
        "y" int NOT NULL DEFAULT 0,
        "w" int NOT NULL DEFAULT 4,
        "h" int NOT NULL DEFAULT 2,
        "size" text NOT NULL DEFAULT 'md',
        "visible" boolean NOT NULL DEFAULT true,
        "config" jsonb NOT NULL DEFAULT '{}',
        "sortOrder" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_dashboard_widget_instances_layout"
        ON "dashboard_widget_instances" ("layoutId", "sortOrder");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dashboard_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NULL,
        "name" text NOT NULL,
        "category" text NOT NULL,
        "minPlanSlug" text NULL,
        "widgets" jsonb NOT NULL DEFAULT '[]',
        "isSystem" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dashboard_widget_permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "widgetType" text NOT NULL UNIQUE,
        "minPlanSlug" text NOT NULL DEFAULT 'advanced',
        "requiredAddon" text NULL,
        "allowResize" boolean NOT NULL DEFAULT true,
        "isAiWidget" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dashboard_ai_widgets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "layoutId" uuid NULL REFERENCES "dashboard_layouts"("id") ON DELETE SET NULL,
        "prompt" text NOT NULL,
        "generatedConfig" jsonb NOT NULL DEFAULT '{}',
        "widgetType" text NOT NULL,
        "status" text NOT NULL DEFAULT 'draft',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_dashboard_ai_widgets_member"
        ON "dashboard_ai_widgets" ("tenantId", "userId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dashboard_addons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "addonKey" text NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "priceCents" int NOT NULL DEFAULT 0,
        "expiresAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("tenantId", "addonKey")
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dashboard_addons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dashboard_ai_widgets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dashboard_widget_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dashboard_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dashboard_widget_instances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dashboard_layouts"`);
  }
}
