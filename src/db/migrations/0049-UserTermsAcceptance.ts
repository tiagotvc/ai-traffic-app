import { MigrationInterface, QueryRunner } from "typeorm";

export class UserTermsAcceptance_1735831900000 implements MigrationInterface {
  name = "UserTermsAcceptance_1735831900000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "termsAcceptedAt" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "termsAcceptedVersion" text NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "termsAcceptedAt",
        DROP COLUMN IF EXISTS "termsAcceptedVersion"
    `);
  }
}
