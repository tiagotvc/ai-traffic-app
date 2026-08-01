import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Controla quais linhas de recurso (PLAN_DISPLAY_ROWS) aparecem no card compacto da
 * landing e/ou no comparativo completo — editável no admin, sem deploy. Seed já nasce
 * com audienceCreator/reports visíveis no compacto (resolve de cara o "não tá
 * aparecendo Relatórios/Persona" relatado).
 */
export class PlanFeatureVisibility_1735930300000 implements MigrationInterface {
  name = "PlanFeatureVisibility_1735930300000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "plan_feature_visibility" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "featureKey" text NOT NULL UNIQUE,
        "showCompact" boolean NOT NULL DEFAULT true,
        "showFull" boolean NOT NULL DEFAULT true,
        "sortOrder" int NOT NULL DEFAULT 0
      );
    `);

    const rows: Array<[string, boolean, boolean, number]> = [
      ["clients", true, true, 0],
      ["adAccounts", true, true, 1],
      ["campaignCreator", false, true, 2],
      ["audienceCreator", true, true, 3],
      ["creativeCreator", false, true, 4],
      ["adCreator", false, true, 5],
      ["creativeRanking", false, true, 6],
      ["aiCredits", true, true, 7],
      ["members", false, true, 8],
      ["persona", true, true, 9],
      ["cortex", false, true, 10],
      ["copilot", true, true, 11],
      ["reports", true, true, 12],
      ["reportSchedule", false, true, 13],
      ["dashboard", false, true, 14]
    ];

    for (const [featureKey, showCompact, showFull, sortOrder] of rows) {
      await queryRunner.query(
        `INSERT INTO "plan_feature_visibility" ("id", "featureKey", "showCompact", "showFull", "sortOrder")
         VALUES (uuid_generate_v4(), $1, $2, $3, $4)
         ON CONFLICT ("featureKey") DO NOTHING;`,
        [featureKey, showCompact, showFull, sortOrder]
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_feature_visibility";`);
  }
}
