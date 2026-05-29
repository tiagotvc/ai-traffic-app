import { MigrationInterface, QueryRunner } from "typeorm";

export class MetaBusinessAssets1735690300000 implements MigrationInterface {
  name = "MetaBusinessAssets1735690300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meta_businesses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        "metaBusinessId" text NOT NULL,
        name text NOT NULL,
        "lastSyncedAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("tenantId", "metaBusinessId")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_meta_businesses_tenant ON meta_businesses("tenantId");`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meta_pages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        "metaBusinessId" text NULL,
        "metaPageId" text NOT NULL,
        name text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("tenantId", "metaPageId")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_meta_pages_tenant_bm ON meta_pages("tenantId", "metaBusinessId");`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meta_ad_account_inventory (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        "metaBusinessId" text NULL,
        "metaAdAccountId" text NOT NULL,
        label text NULL,
        "isDemo" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("tenantId", "metaAdAccountId")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_meta_ad_inv_tenant_bm ON meta_ad_account_inventory("tenantId", "metaBusinessId");`
    );

    await queryRunner.query(`
      ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS "metaBusinessId" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ad_accounts DROP COLUMN IF EXISTS "metaBusinessId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS meta_ad_account_inventory;`);
    await queryRunner.query(`DROP TABLE IF EXISTS meta_pages;`);
    await queryRunner.query(`DROP TABLE IF EXISTS meta_businesses;`);
  }
}
