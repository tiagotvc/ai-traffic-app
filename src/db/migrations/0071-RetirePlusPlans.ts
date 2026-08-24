import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Aposenta os planos "Plus" (basic-plus/advanced-pro/agency-pro) — não são mais
 * vendidos. Soft delete (isActive=false), não hard delete: subscriptions/invoices
 * têm FK pra plans.id, e não há assinante nenhum nesses slugs hoje (confirmado por
 * query direta antes desta migração) — mesmo padrão já usado pro slug legado 'pro'
 * em CanonicalPlanFamilies_1735833200000.
 */
export class RetirePlusPlans_1735930100000 implements MigrationInterface {
  name = "RetirePlusPlans_1735930100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET "isActive" = false
      WHERE slug IN ('basic-plus', 'advanced-pro', 'agency-pro');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET "isActive" = true
      WHERE slug IN ('basic-plus', 'advanced-pro', 'agency-pro');
    `);
  }
}
