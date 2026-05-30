import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClientMetaBusiness1735690400000 implements MigrationInterface {
  name = "ClientMetaBusiness1735690400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS "metaBusinessId" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS "metaBusinessId";`);
  }
}
