import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientMetaPublish1735690100000 implements MigrationInterface {
  name = "ClientMetaPublish1735690100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS "metaPageId" text NULL;`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS "metaLinkUrl" text NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS "metaLinkUrl";`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS "metaPageId";`);
  }
}
