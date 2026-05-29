import { MigrationInterface, QueryRunner } from "typeorm";

export class UserPasswordHash1735689700000 implements MigrationInterface {
  name = "UserPasswordHash1735689700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "passwordHash" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS "passwordHash";
    `);
  }
}
