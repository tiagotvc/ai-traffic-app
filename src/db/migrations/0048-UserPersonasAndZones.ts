import type { MigrationInterface, QueryRunner } from "typeorm";

export class UserPersonasAndZones1735831800000 implements MigrationInterface {
  name = "UserPersonasAndZones1735831800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_personas (
        id uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        "ageMin" int NOT NULL DEFAULT 18,
        "ageMax" int NOT NULL DEFAULT 65,
        gender text NOT NULL DEFAULT 'all',
        targeting jsonb NOT NULL,
        "sourcePrompt" text
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_personas_tenant_user"
      ON user_personas ("tenantId", "userId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_zones (
        id uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        "geoRules" jsonb NOT NULL,
        "sourcePrompt" text
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_zones_tenant_user"
      ON user_zones ("tenantId", "userId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_zones`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_personas`);
  }
}
