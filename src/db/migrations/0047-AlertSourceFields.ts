import { MigrationInterface, QueryRunner } from "typeorm";

export class AlertSourceFields_1735831700000 implements MigrationInterface {
  name = "AlertSourceFields_1735831700000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alerts"
        ADD COLUMN IF NOT EXISTS "source" text NULL,
        ADD COLUMN IF NOT EXISTS "automationRuleId" uuid NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alerts"
        DROP COLUMN IF EXISTS "source",
        DROP COLUMN IF EXISTS "automationRuleId"
    `);
  }
}
