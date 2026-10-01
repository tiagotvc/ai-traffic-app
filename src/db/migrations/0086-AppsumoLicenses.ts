import { MigrationInterface, QueryRunner } from "typeorm";

/** One row per AppSumo license_key — created on `purchase`, linked to a tenant on OAuth activation. */
export class AppsumoLicenses_1739200000000 implements MigrationInterface {
  name = "AppsumoLicenses_1739200000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appsumo_licenses" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "licenseKey" text NOT NULL,
        "prevLicenseKey" text,
        "tenantId" uuid,
        "tier" int,
        "licenseStatus" text NOT NULL DEFAULT 'inactive',
        "partnerPlanName" text,
        "parentLicenseKey" text,
        "unitQuantity" int,
        "lastEvent" text,
        "lastEventAt" timestamptz,
        "rawPayload" jsonb
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_appsumo_licenses_license_key"
      ON "appsumo_licenses" ("licenseKey");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appsumo_licenses_tenant"
      ON "appsumo_licenses" ("tenantId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appsumo_licenses_parent"
      ON "appsumo_licenses" ("parentLicenseKey");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "appsumo_licenses";`);
  }
}
