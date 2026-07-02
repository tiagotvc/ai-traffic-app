import type { MigrationInterface, QueryRunner } from "typeorm";

/** Backfill idempotente: planos básicos preservam o resumo antigo; tiers superiores recebem Commander. */
export class CommanderPlanAccess_1735833100000 implements MigrationInterface {
  name = "CommanderPlanAccess_1735833100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans
      SET limits = COALESCE(limits, '{}'::jsonb) ||
        jsonb_build_object(
          'allowCommander',
          CASE
            WHEN slug IN ('advanced', 'advanced-pro', 'agency', 'agency-pro') THEN true
            ELSE false
          END
        )
      WHERE NOT (COALESCE(limits, '{}'::jsonb) ? 'allowCommander');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE plans SET limits = COALESCE(limits, '{}'::jsonb) - 'allowCommander';`);
  }
}
