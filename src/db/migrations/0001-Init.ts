import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1735689600000 implements MigrationInterface {
  name = "Init1735689600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // UUIDs: prefer pgcrypto for gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        name text NOT NULL,
        "brandName" text NULL,
        "logoUrl" text NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        email text NOT NULL UNIQUE,
        name text NULL,
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        name text NOT NULL,
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        "aiContext" jsonb NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ad_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        "metaAdAccountId" text NOT NULL,
        label text NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meta_auth (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "accessToken" text NOT NULL,
        "expiresAt" timestamptz NULL,
        "tokenType" text NULL,
        scopes text NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS metric_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "adAccountId" uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
        day date NOT NULL,
        spend numeric(18,2) NOT NULL DEFAULT 0,
        impressions bigint NOT NULL DEFAULT 0,
        clicks bigint NOT NULL DEFAULT 0,
        ctr numeric(10,4) NOT NULL DEFAULT 0,
        cpc numeric(18,4) NOT NULL DEFAULT 0,
        conversions bigint NOT NULL DEFAULT 0,
        roas numeric(18,4) NOT NULL DEFAULT 0,
        CONSTRAINT metric_snapshots_unique UNIQUE ("adAccountId", day)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NULL,
        "adAccountId" uuid NULL,
        type text NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        dismissed boolean NOT NULL DEFAULT false
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS alerts_tenant_createdAt ON alerts ("tenantId", "createdAt");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NULL,
        "targetId" text NULL,
        "actionType" text NOT NULL,
        payload jsonb NOT NULL,
        justification text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        preview jsonb NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ai_recommendations_tenant_createdAt ON ai_recommendations ("tenantId", "createdAt");`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NULL,
        kind text NOT NULL,
        request jsonb NULL,
        response jsonb NULL,
        success boolean NOT NULL DEFAULT true,
        "errorMessage" text NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS audit_logs_tenant_createdAt ON audit_logs ("tenantId", "createdAt");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_state (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "lastLogoutAt" timestamptz NULL,
        "lastLoginAt" timestamptz NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification_state;`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_recommendations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS alerts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS metric_snapshots;`);
    await queryRunner.query(`DROP TABLE IF EXISTS meta_auth;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ad_accounts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS clients;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants;`);
  }
}

