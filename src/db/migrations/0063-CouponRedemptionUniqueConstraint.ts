import type { MigrationInterface, QueryRunner } from "typeorm";

export class CouponRedemptionUniqueConstraint_1735833300000 implements MigrationInterface {
  name = "CouponRedemptionUniqueConstraint_1735833300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicatas pré-existentes (mantém o resgate mais antigo por cupom+tenant) antes de
    // criar o índice único, senão a migração falha em bancos que já tenham dados de corrida.
    await queryRunner.query(`
      DELETE FROM coupon_redemptions a
      USING coupon_redemptions b
      WHERE a."couponId" = b."couponId"
        AND a."tenantId" = b."tenantId"
        AND a."createdAt" > b."createdAt";
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_coupon_redemptions_coupon_tenant
      ON coupon_redemptions ("couponId", "tenantId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_coupon_redemptions_coupon_tenant;`);
  }
}
