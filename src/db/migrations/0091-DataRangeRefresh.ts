import type { MigrationInterface, QueryRunner } from "typeorm";

export class DataRangeRefresh1739200500000 implements MigrationInterface {
  name = "DataRangeRefresh1739200500000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS data_range_refreshes (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL,
      "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE, platform text NOT NULL,
      since date NOT NULL, until date NOT NULL, "refreshedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_data_range_refresh" UNIQUE ("tenantId", "clientId", platform)
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`DROP TABLE IF EXISTS data_range_refreshes`); }
}
