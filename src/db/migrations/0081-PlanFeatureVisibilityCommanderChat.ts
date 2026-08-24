import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Seed de visibilidade pra nova linha "Commander — Chat" em PLAN_DISPLAY_ROWS — sem isso
 * ela fica visível "por acidente" nas telas públicas (fallback do filtro) mas invisível
 * e não-editável no admin (/admin/billing/plans). Mesmo padrão de 0073-PlanFeatureVisibility.
 */
export class PlanFeatureVisibilityCommanderChat_1736000000000 implements MigrationInterface {
  name = "PlanFeatureVisibilityCommanderChat_1736000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "plan_feature_visibility" ("id", "featureKey", "showCompact", "showFull", "sortOrder")
       VALUES (uuid_generate_v4(), $1, $2, $3, $4)
       ON CONFLICT ("featureKey") DO NOTHING;`,
      ["commanderChat", true, true, 15]
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "plan_feature_visibility" WHERE "featureKey" = 'commanderChat';`);
  }
}
