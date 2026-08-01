import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Amplia o pool mensal de créditos de IA (mesmo campo `maxAiRequestsPerMonth`,
 * sem rename) antes de campanha/anúncio/persona/zona/criativo passarem a
 * consumir do mesmo pool. Precisa rodar antes da virada de chave que liga
 * `creditsV2Enabled` e passa a cobrar essas ações novas — senão tenants ativos
 * estouram o teto antigo (pensado só pra chat) no primeiro dia.
 */
export class CreditPoolExpansion_1735940000000 implements MigrationInterface {
  name = "CreditPoolExpansion_1735940000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({ maxAiRequestsPerMonth: 200 })}'::jsonb
      WHERE slug = 'basic';
    `);
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({ maxAiRequestsPerMonth: 500 })}'::jsonb
      WHERE slug = 'advanced';
    `);
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({ maxAiRequestsPerMonth: 1100 })}'::jsonb
      WHERE slug = 'agency';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({ maxAiRequestsPerMonth: 50 })}'::jsonb
      WHERE slug = 'basic';
    `);
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({ maxAiRequestsPerMonth: 150 })}'::jsonb
      WHERE slug = 'advanced';
    `);
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({ maxAiRequestsPerMonth: 250 })}'::jsonb
      WHERE slug = 'agency';
    `);
  }
}
