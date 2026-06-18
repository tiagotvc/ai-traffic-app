import type { MigrationInterface, QueryRunner } from "typeorm";

export class VideoUploadSessions1735830900000 implements MigrationInterface {
  name = "VideoUploadSessions1735830900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS video_upload_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "clientSlug" text NOT NULL,
        "adAccountId" text NOT NULL,
        label text NOT NULL,
        "fileName" text NOT NULL,
        "totalSize" int NOT NULL,
        "totalChunks" int NOT NULL,
        "receivedParts" jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_video_upload_sessions_tenant
        ON video_upload_sessions ("tenantId", "createdAt");

      CREATE TABLE IF NOT EXISTS video_upload_parts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sessionId" uuid NOT NULL REFERENCES video_upload_sessions(id) ON DELETE CASCADE,
        "partIndex" int NOT NULL,
        data bytea NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("sessionId", "partIndex")
      );
      CREATE INDEX IF NOT EXISTS idx_video_upload_parts_session
        ON video_upload_parts ("sessionId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS video_upload_parts;
      DROP TABLE IF EXISTS video_upload_sessions;
    `);
  }
}
