import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ponte alerta → conversa: quando o motor de automação dispara um alerta `alert_only`,
 * grava uma pergunta pronta pro Commander junto — abre uma conversa em vez de só avisar.
 */
export class AlertCommanderPrompt_1735990000000 implements MigrationInterface {
  name = "AlertCommanderPrompt_1735990000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "commanderPrompt" text;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "commanderPrompt";`);
  }
}
