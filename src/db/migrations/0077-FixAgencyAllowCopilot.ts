import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0076-FixAdvancedAllowCopilot corrigiu `allowCopilot` só no bloco do advanced —
 * o comentário dela já apontava que 0072 "corrigiu maxScientists de advanced/agency"
 * mas deixou `allowCopilot` de fora dos dois blocos, e só o de advanced foi
 * corrigido depois. A linha de agency seguia sem essa chave (`null`), e
 * `CommanderNavGroup`/`/commander/scientists` tratam ausência como bloqueado —
 * mostrando cadeado em "Cientistas" pra tenants Agency mesmo com
 * AGENCY_LIMITS.allowCopilot = true em types.ts.
 */
export class FixAgencyAllowCopilot_1735960000000 implements MigrationInterface {
  name = "FixAgencyAllowCopilot_1735960000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({ allowCopilot: true })}'::jsonb
      WHERE slug = 'agency';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits - 'allowCopilot'
      WHERE slug = 'agency';
    `);
  }
}
