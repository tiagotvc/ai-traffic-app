import { MigrationInterface, QueryRunner } from "typeorm";

/** Nível 4 do motor de regras: escopo por campanha (default histórico), conjunto ou anúncio. */
export class AutomationRuleLevel_1735833600000 implements MigrationInterface {
  name = "AutomationRuleLevel_1735833600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "level" text NOT NULL DEFAULT 'campaign';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "automation_rules" DROP COLUMN IF EXISTS "level";
    `);
  }
}
