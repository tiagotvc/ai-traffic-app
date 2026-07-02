import type { MigrationInterface, QueryRunner } from "typeorm";

/** Consolida o catálogo comercial em 3 famílias, cada uma com variante Plus. */
export class CanonicalPlanFamilies_1735833200000 implements MigrationInterface {
  name = "CanonicalPlanFamilies_1735833200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans
      SET
        name = CASE slug
          WHEN 'basic' THEN 'Individual'
          WHEN 'basic-plus' THEN 'Individual Plus'
          WHEN 'advanced' THEN 'Advanced'
          WHEN 'advanced-pro' THEN 'Advanced Plus'
          WHEN 'agency' THEN 'Agency'
          WHEN 'agency-pro' THEN 'Agency Plus'
          ELSE name
        END,
        "sortOrder" = CASE slug
          WHEN 'basic' THEN 10
          WHEN 'basic-plus' THEN 20
          WHEN 'advanced' THEN 30
          WHEN 'advanced-pro' THEN 40
          WHEN 'agency' THEN 50
          WHEN 'agency-pro' THEN 60
          ELSE "sortOrder"
        END,
        "isActive" = true
      WHERE slug IN ('basic', 'basic-plus', 'advanced', 'advanced-pro', 'agency', 'agency-pro');
    `);

    await queryRunner.query(`UPDATE plans SET "isActive" = false WHERE slug = 'pro';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans
      SET name = CASE slug
        WHEN 'advanced-pro' THEN 'Advanced Pro'
        WHEN 'agency-pro' THEN 'Agency Pro'
        ELSE name
      END
      WHERE slug IN ('advanced-pro', 'agency-pro');
    `);
  }
}
