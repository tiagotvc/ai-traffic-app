import type { MigrationInterface, QueryRunner } from "typeorm";

export class WorkspaceMembers1735690600000 implements MigrationInterface {
  name = "WorkspaceMembers1735690600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        role text NOT NULL DEFAULT 'member',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("tenantId", "userId")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members("tenantId");`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_invites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        email text NOT NULL,
        role text NOT NULL DEFAULT 'member',
        token text NOT NULL UNIQUE,
        "expiresAt" timestamptz NOT NULL,
        "invitedByUserId" uuid NULL,
        "acceptedAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant ON tenant_invites("tenantId");`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tenant_invites_email ON tenant_invites(email);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_invites;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_members;`);
  }
}
