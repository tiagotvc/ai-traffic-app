import { MigrationInterface, QueryRunner } from "typeorm";

export class ContactMessages_1735832000000 implements MigrationInterface {
  name = "ContactMessages_1735832000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contact_messages" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "name" text NOT NULL,
        "email" text NOT NULL,
        "company" text NULL,
        "subject" text NOT NULL,
        "message" text NOT NULL,
        "status" text NOT NULL DEFAULT 'new',
        "source" text NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_contact_messages_created_at"
        ON "contact_messages" ("createdAt" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_messages"`);
  }
}
