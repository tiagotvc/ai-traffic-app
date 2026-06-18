import type { MigrationInterface, QueryRunner } from "typeorm";

export class AudienceInsightBreakdowns1735831000000 implements MigrationInterface {
  name = "AudienceInsightBreakdowns1735831000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audience_insight_breakdowns (
        id uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "clientId" uuid NOT NULL,
        "metaAdAccountId" text NOT NULL,
        "breakdownType" text NOT NULL,
        "breakdownValue" text NOT NULL,
        "periodDays" int NOT NULL DEFAULT 30,
        spend numeric(14,2) NOT NULL DEFAULT 0,
        conversions numeric(14,2) NOT NULL DEFAULT 0,
        roas numeric(14,2),
        cpa numeric(14,2),
        "rawRow" jsonb,
        "syncedAt" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_audience_insight_breakdowns_unique"
      ON audience_insight_breakdowns ("clientId", "metaAdAccountId", "breakdownType", "breakdownValue", "periodDays")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audience_insight_breakdowns`);
  }
}
