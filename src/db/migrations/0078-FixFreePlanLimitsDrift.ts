import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0015-BillingPlansV2 só escreveu 8 chaves no limits JSONB do plano free
 * (maxClients, maxAdAccounts, maxMembers, maxAutomationRules, maxAiRequestsPerMonth,
 * maxScheduledReports, allowAutoSync, allowLiveMeta). Nenhuma migration depois tocou
 * o free (0072 só corrigiu basic/advanced/agency). Como `resolveLimits` cai pro
 * fallback hardcoded quando a chave falta no banco — e esse fallback NÃO bate com
 * `FREE_LIMITS` pra dois campos — o free real ficou diferente do pretendido:
 * maxAudiencePersonas resolvia pra -1 (ilimitado) em vez de 2, e allowRankingConfig
 * resolvia pra true (habilitado) em vez de false. Mesma classe de bug do
 * 0077-FixAgencyAllowCopilot: chave ausente no JSONB != valor pretendido no código.
 */
export class FixFreePlanLimitsDrift_1735970000000 implements MigrationInterface {
  name = "FixFreePlanLimitsDrift_1735970000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({
        maxAudiencePersonas: 2,
        allowRankingConfig: false
      })}'::jsonb
      WHERE slug = 'free';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits - 'maxAudiencePersonas' - 'allowRankingConfig'
      WHERE slug = 'free';
    `);
  }
}
