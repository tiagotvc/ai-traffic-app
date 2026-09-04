import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientGoogleAdsManager1739200200000 implements MigrationInterface {
  name = "ClientGoogleAdsManager1739200200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "googleAdsLoginCustomerId" text`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "googleAdsLoginCustomerId"`
    );
  }
}
