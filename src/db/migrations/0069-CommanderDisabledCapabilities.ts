import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Preferência do usuário (não é feature flag de plataforma): quais capacidades/Scientists
 * do Commander ele desligou por conta própria (ex.: "não quero que o Commander opine
 * sobre X"). Efetivo só quando a plataforma também permite — os dois lados têm que topar.
 */
export class CommanderDisabledCapabilities_1735920000000 implements MigrationInterface {
  name = "CommanderDisabledCapabilities_1735920000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "commanderDisabledCapabilities" jsonb NOT NULL DEFAULT '[]';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants" DROP COLUMN IF EXISTS "commanderDisabledCapabilities";
    `);
  }
}
