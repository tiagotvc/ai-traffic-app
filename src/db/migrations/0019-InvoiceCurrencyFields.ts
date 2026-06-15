import type { MigrationInterface, QueryRunner } from "typeorm";

export class InvoiceCurrencyFields_1735691600000 implements MigrationInterface {
  name = "InvoiceCurrencyFields_1735691600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'BRL';
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "taxCents" int;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "feeCents" int;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "netCents" int;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE invoices DROP COLUMN IF EXISTS "netCents";
      ALTER TABLE invoices DROP COLUMN IF EXISTS "feeCents";
      ALTER TABLE invoices DROP COLUMN IF EXISTS "taxCents";
      ALTER TABLE invoices DROP COLUMN IF EXISTS "currency";
    `);
  }
}
