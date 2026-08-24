import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Atribuição de campanha e consentimento de rastreio por usuário.
 *
 * `signupAttribution` guarda os parâmetros de campanha (utm, fbclid, gclid) que
 * vieram na URL do anúncio até o cadastro — permite responder "qual campanha
 * trouxe assinante", não só cadastro.
 *
 * `analyticsConsent` existe porque o webhook de cobrança (Asaas/Stripe) roda sem
 * navegador: não há cookie pra consultar na hora de decidir se pode mandar o
 * `Purchase` pra Meta. Sem esta coluna não dá pra respeitar a LGPD nesse ponto.
 */
export class SignupAttributionAndConsent_1735980000000 implements MigrationInterface {
  name = "SignupAttributionAndConsent_1735980000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "signupAttribution" jsonb,
        ADD COLUMN IF NOT EXISTS "analyticsConsent" text,
        ADD COLUMN IF NOT EXISTS "analyticsConsentAt" timestamptz;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "signupAttribution",
        DROP COLUMN IF EXISTS "analyticsConsent",
        DROP COLUMN IF EXISTS "analyticsConsentAt";
    `);
  }
}
