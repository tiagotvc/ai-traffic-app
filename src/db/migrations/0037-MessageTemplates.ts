import type { MigrationInterface, QueryRunner } from "typeorm";

export class MessageTemplates1735830700000 implements MigrationInterface {
  name = "MessageTemplates1735830700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clientId" uuid NOT NULL,
        channel text NOT NULL,
        name text NOT NULL,
        greeting text NOT NULL DEFAULT '',
        icebreakers jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_message_templates_client
        ON message_templates ("clientId");
      ALTER TABLE client_meta_settings
        ADD COLUMN IF NOT EXISTS "defaultUtm" jsonb NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_meta_settings DROP COLUMN IF EXISTS "defaultUtm";
      DROP TABLE IF EXISTS message_templates;
    `);
  }
}
