import { MigrationInterface, QueryRunner } from "typeorm";

/** Log de tentativas de e-mail transacional (visibilidade + reenvio manual no admin). */
export class EmailLogs_1735930000000 implements MigrationInterface {
  name = "EmailLogs_1735930000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_logs" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "kind" text NOT NULL,
        "to" text NOT NULL,
        "payload" jsonb NOT NULL,
        "sent" boolean NOT NULL,
        "error" text
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_logs_tenantId" ON "email_logs" ("tenantId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_logs_createdAt" ON "email_logs" ("createdAt");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "email_logs";`);
  }
}
