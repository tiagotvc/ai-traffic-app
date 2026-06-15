import type { MigrationInterface, QueryRunner } from "typeorm";

export class TenantGeminiModel_1735692300000 implements MigrationInterface {
  name = "TenantGeminiModel_1735692300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS "preferredGeminiModel" text;
    `);

    await queryRunner.query(`
      UPDATE plans
      SET limits = limits || '{"allowCreativeMemoryAi": true}'::jsonb
      WHERE limits->>'allowCreativeMemoryAi' IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants DROP COLUMN IF EXISTS "preferredGeminiModel";
    `);
  }
}
