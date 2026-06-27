import { MigrationInterface, QueryRunner } from "typeorm";

export class CapiEventLogs_1735832500000 implements MigrationInterface {
  name = "CapiEventLogs_1735832500000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "capi_event_logs" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "pixelId" text NULL,
        "eventName" text NOT NULL,
        "success" boolean NOT NULL DEFAULT false,
        "eventsReceived" int NULL,
        "error" text NULL,
        "test" boolean NOT NULL DEFAULT false
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_capi_event_logs_client"
        ON "capi_event_logs" ("tenantId", "clientId", "createdAt" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "capi_event_logs"`);
  }
}
