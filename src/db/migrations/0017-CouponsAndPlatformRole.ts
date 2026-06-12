import type { MigrationInterface, QueryRunner } from "typeorm";

export class CouponsAndPlatformRole_1735691400000 implements MigrationInterface {
  name = "CouponsAndPlatformRole_1735691400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "platformRole" text NOT NULL DEFAULT 'user';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS discount_coupons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        "percentOff" int NOT NULL,
        "maxUses" int,
        "usedCount" int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "validFrom" timestamptz,
        "validUntil" timestamptz,
        "allowedPlanSlugs" jsonb,
        "minChargeCents" int NOT NULL DEFAULT 100,
        description text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "couponId" uuid NOT NULL REFERENCES discount_coupons(id),
        "tenantId" uuid NOT NULL,
        "userId" uuid,
        "invoiceId" uuid,
        "discountCents" int NOT NULL,
        "finalAmountCents" int NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_tenant
      ON coupon_redemptions ("tenantId", "couponId");
    `);

    await queryRunner.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS "couponId" uuid,
      ADD COLUMN IF NOT EXISTS "couponDiscountCents" int;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS "couponDiscountCents";`);
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS "couponId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS coupon_redemptions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS discount_coupons;`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "platformRole";`);
  }
}
