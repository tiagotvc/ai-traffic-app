import type { MigrationInterface, QueryRunner } from "typeorm";

export class SocialAuthAndGoogleAds_1735691500000 implements MigrationInterface {
  name = "SocialAuthAndGoogleAds_1735691500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "googleId" text UNIQUE,
      ADD COLUMN IF NOT EXISTS "facebookId" text UNIQUE;
    `);

    await queryRunner.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS "googleAdsCustomerId" text;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS google_auth (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL UNIQUE,
        "accessToken" text,
        "refreshToken" text,
        scopes text,
        "expiresAt" timestamptz,
        "adsCustomerId" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS google_auth;`);
    await queryRunner.query(`
      ALTER TABLE clients DROP COLUMN IF EXISTS "googleAdsCustomerId";
    `);
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS "googleId",
      DROP COLUMN IF EXISTS "facebookId";
    `);
  }
}
