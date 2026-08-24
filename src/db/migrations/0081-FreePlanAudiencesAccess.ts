import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * O plano Free tinha `allowNavAudiences: false`, o que bloqueava a área de
 * Públicos inteira. Dois efeitos indesejados:
 *
 * 1. O Free não conseguia criar um público personalizado (remarketing) na Meta,
 *    embora o criador de campanha já permitisse selecionar um existente.
 * 2. O plano concede `maxAudiencePersonas: 2`, mas bloqueava a única tela onde
 *    essas personas seriam criadas — o limite era letra morta.
 *
 * O Orion Persona continua controlado por `maxAudiencePersonas`, não por este
 * flag: 0 (Individual) tranca a biblioteca com cadeado no menu, 2 (Free) libera
 * com cota. Nada além do flag de navegação muda aqui.
 *
 * Grava a chave explicitamente no JSONB: quando ela falta, `resolveLimits` cai
 * no fallback hardcoded — mesma classe de drift corrigida em 0077/0078.
 */
export class FreePlanAudiencesAccess_1736000000000 implements MigrationInterface {
  name = "FreePlanAudiencesAccess_1736000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({
        allowNavAudiences: true
      })}'::jsonb
      WHERE slug = 'free';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({
        allowNavAudiences: false
      })}'::jsonb
      WHERE slug = 'free';
    `);
  }
}
