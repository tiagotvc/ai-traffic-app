import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds migration tracking column on client_saved_targeting.
 * Data migration runs via scripts/migrate-saved-targeting-to-personas-zones.ts (idempotent).
 */
export class MigrateClientSavedTargeting1735831900000 implements MigrationInterface {
  name = "MigrateClientSavedTargeting1735831900000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_saved_targeting
      ADD COLUMN IF NOT EXISTS "migratedToPersonaZoneAt" timestamptz
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_saved_targeting
      DROP COLUMN IF EXISTS "migratedToPersonaZoneAt"
    `);
  }
}
