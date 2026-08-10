import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Libera Relatórios no plano Free (`allowNavReports: true`).
 *
 * O acesso é naturalmente temporário: o Free é um trial (`plans.trialDays`) e,
 * quando `currentPeriodEnd` vence, o cron de billing marca a assinatura como
 * "suspended" e `assertTenantCanLogin` corta o acesso. Não é preciso nenhum
 * mecanismo de prazo próprio para esta liberação.
 *
 * `maxScheduledReports` continua 0 — gerar e visualizar sim, agendar envio
 * recorrente não.
 *
 * Grava a chave explicitamente no JSONB: quando ela falta, `resolveLimits` cai
 * no fallback hardcoded — mesma classe de drift corrigida em 0077/0078.
 */
export class FreePlanReportsAccess_1736010000000 implements MigrationInterface {
  name = "FreePlanReportsAccess_1736010000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({
        allowNavReports: true
      })}'::jsonb
      WHERE slug = 'free';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({
        allowNavReports: false
      })}'::jsonb
      WHERE slug = 'free';
    `);
  }
}
