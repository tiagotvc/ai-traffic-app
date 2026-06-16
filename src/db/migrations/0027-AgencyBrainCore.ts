import type { MigrationInterface, QueryRunner } from "typeorm";

export class AgencyBrainCore_1735692400000 implements MigrationInterface {
  name = "AgencyBrainCore_1735692400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE client_learnings
      ADD COLUMN IF NOT EXISTS "confidenceScore" smallint;
    `);

    await queryRunner.query(`
      UPDATE client_learnings
      SET "confidenceScore" = CASE confidence
        WHEN 'HIGH' THEN 85
        WHEN 'MEDIUM' THEN 65
        ELSE 40
      END
      WHERE "confidenceScore" IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_hypotheses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        category text NOT NULL,
        "confidenceScore" smallint NOT NULL DEFAULT 40,
        status text NOT NULL DEFAULT 'SUGGESTED',
        source text NOT NULL,
        evidence jsonb,
        "promotedLearningId" uuid,
        "dedupeKey" text
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_hypotheses_tenant_client
      ON client_hypotheses ("tenantId", "clientId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_hypotheses_dedupe
      ON client_hypotheses ("tenantId", "clientId", "dedupeKey")
      WHERE "dedupeKey" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_dna (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL UNIQUE,
        audiences jsonb NOT NULL DEFAULT '{"works":[],"doesntWork":[]}',
        creatives jsonb NOT NULL DEFAULT '{"works":[],"doesntWork":[]}',
        placements jsonb NOT NULL DEFAULT '{"works":[],"doesntWork":[]}',
        offers jsonb NOT NULL DEFAULT '{"works":[],"doesntWork":[]}',
        copy jsonb NOT NULL DEFAULT '{"works":[],"doesntWork":[]}',
        seasonality jsonb NOT NULL DEFAULT '{"works":[],"doesntWork":[]}',
        "summaryText" text NOT NULL DEFAULT '',
        "lastDerivedAt" timestamptz,
        "manualOverrides" jsonb NOT NULL DEFAULT '{}',
        "approvedLearningCount" int NOT NULL DEFAULT 0
      );
    `);

    await queryRunner.query(`
      ALTER TABLE client_action_suggestions
      ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'MEDIUM';
    `);

    await queryRunner.query(`
      ALTER TABLE client_action_suggestions
      ADD COLUMN IF NOT EXISTS "linkedLearningIds" jsonb NOT NULL DEFAULT '[]';
    `);

    await queryRunner.query(`
      ALTER TABLE client_action_suggestions
      ADD COLUMN IF NOT EXISTS "linkedHypothesisIds" jsonb NOT NULL DEFAULT '[]';
    `);

    await queryRunner.query(`
      UPDATE client_action_suggestions
      SET "linkedLearningIds" = jsonb_build_array("linkedLearningId")
      WHERE "linkedLearningId" IS NOT NULL
        AND ("linkedLearningIds" IS NULL OR "linkedLearningIds" = '[]'::jsonb);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_timeline_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        type text NOT NULL,
        title text NOT NULL,
        description text,
        metadata jsonb,
        "sourceId" text,
        "sourceType" text
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_timeline_events_client
      ON client_timeline_events ("tenantId", "clientId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_experiments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        title text NOT NULL,
        "variantA" text NOT NULL,
        "variantB" text NOT NULL,
        winner text,
        metrics jsonb,
        conclusion text,
        "hypothesisId" uuid
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_action_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "tenantId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        title text NOT NULL,
        "generatedAt" timestamptz NOT NULL DEFAULT now(),
        status text NOT NULL DEFAULT 'active'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_action_plan_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "planId" uuid NOT NULL REFERENCES client_action_plans(id) ON DELETE CASCADE,
        title text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        "dueDate" date,
        "suggestionId" uuid,
        "sortOrder" int NOT NULL DEFAULT 0
      );
    `);

    await queryRunner.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS niche text;
    `);

    await queryRunner.query(`
      UPDATE plans SET limits = limits || '{
        "allowAgencyBrainHypotheses": true,
        "allowAgencyBrainDna": true,
        "allowAgencyBrainTimeline": false,
        "allowAgencyBrainExperiments": false,
        "allowAgencyBrainActionPlans": false,
        "allowAgencyBrainChat": false
      }'::jsonb
      WHERE limits->>'allowAgencyBrainHypotheses' IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS niche;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_action_plan_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_action_plans;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_experiments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_timeline_events;`);
    await queryRunner.query(`ALTER TABLE client_action_suggestions DROP COLUMN IF EXISTS "linkedHypothesisIds";`);
    await queryRunner.query(`ALTER TABLE client_action_suggestions DROP COLUMN IF EXISTS "linkedLearningIds";`);
    await queryRunner.query(`ALTER TABLE client_action_suggestions DROP COLUMN IF EXISTS priority;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_dna;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_hypotheses;`);
    await queryRunner.query(`ALTER TABLE client_learnings DROP COLUMN IF EXISTS "confidenceScore";`);
  }
}
