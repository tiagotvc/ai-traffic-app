import { MigrationInterface, QueryRunner } from "typeorm";

/** Modo observação do Cortex: automação só observa/recomenda, nunca executa. */
export class AutomationObservationMode_1735833700000 implements MigrationInterface {
  name = "AutomationObservationMode_1735833700000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "automationObservationMode" boolean NOT NULL DEFAULT false;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants" DROP COLUMN IF EXISTS "automationObservationMode";
    `);
  }
}
