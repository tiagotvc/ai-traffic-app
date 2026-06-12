import type { MigrationInterface, QueryRunner } from "typeorm";

export class InvoiceBillingCycle_1735691300000 implements MigrationInterface {
  name = "InvoiceBillingCycle_1735691300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "billingCycle" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS "billingCycle";`);
  }
}
