import { MigrationInterface, QueryRunner } from "typeorm";

export class PixAutomaticAuthorizations_1735832800000 implements MigrationInterface {
  name = "PixAutomaticAuthorizations_1735832800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pix_automatic_authorizations" (
        "id" uuid PRIMARY KEY,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "subscriptionId" uuid NOT NULL,
        "asaasAuthorizationId" text NOT NULL UNIQUE,
        "asaasCustomerId" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "frequency" text NOT NULL,
        "valueCents" int NOT NULL,
        "startDate" date NOT NULL,
        "finishDate" date NULL,
        "nextChargeDueDate" date NOT NULL,
        "lastInstructionCreatedForDueDate" date NULL,
        "lastInstructionCreatedAt" timestamptz NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_pix_auto_tenant" ON "pix_automatic_authorizations" ("tenantId");
      CREATE INDEX IF NOT EXISTS "idx_pix_auto_status_due" ON "pix_automatic_authorizations" ("status", "nextChargeDueDate");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pix_automatic_authorizations"`);
  }
}
