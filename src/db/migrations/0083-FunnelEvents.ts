import { MigrationInterface, QueryRunner } from "typeorm";

/** Funil do site público (planos → checkout) — base do painel admin e do alerta de e-mail. */
export class FunnelEvents_1736020000000 implements MigrationInterface {
  name = "FunnelEvents_1736020000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funnel_events" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "visitorId" text NOT NULL,
        "userId" uuid,
        "tenantId" uuid,
        "eventType" text NOT NULL,
        "planSlug" text,
        "email" text,
        "meta" jsonb
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_funnel_events_type_created"
      ON "funnel_events" ("eventType", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_funnel_events_visitor_type"
      ON "funnel_events" ("visitorId", "eventType");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funnel_events";`);
  }
}
