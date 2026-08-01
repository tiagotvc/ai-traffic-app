import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0072-BackfillCanonicalPlanLimits corrigiu `maxScientists` de advanced/agency mas
 * esqueceu `allowCopilot` no bloco do advanced — a linha ficava sem essa chave
 * (`null`), e `CommanderNavGroup`/`/commander/scientists` tratam ausência como
 * bloqueado, mostrando cadeado em "Cientistas" pra tenants Advanced mesmo com
 * ADVANCED_LIMITS.allowCopilot = true em types.ts.
 */
export class FixAdvancedAllowCopilot_1735950000000 implements MigrationInterface {
  name = "FixAdvancedAllowCopilot_1735950000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({ allowCopilot: true })}'::jsonb
      WHERE slug = 'advanced';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits - 'allowCopilot'
      WHERE slug = 'advanced';
    `);
  }
}
