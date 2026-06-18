import type { MigrationInterface, QueryRunner } from "typeorm";

export class LabsCore1735830700000 implements MigrationInterface {
  name = "LabsCore1735830700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS labs_experiments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id uuid NULL REFERENCES clients(id) ON DELETE SET NULL,
        name text NOT NULL,
        product text NOT NULL,
        niche text NULL,
        market text NULL,
        country text NULL,
        language text NULL,
        objective text NULL,
        competitors jsonb NOT NULL DEFAULT '[]',
        website_url text NULL,
        selected_scientists jsonb NOT NULL DEFAULT '[]',
        selected_sources jsonb NULL,
        status text NOT NULL DEFAULT 'draft',
        estimated_credits int NOT NULL DEFAULT 0,
        credits_used int NOT NULL DEFAULT 0,
        max_credits int NULL,
        max_duration_minutes int NULL,
        dossier jsonb NULL,
        error_message text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        started_at timestamptz NULL,
        completed_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_labs_experiments_tenant_created
      ON labs_experiments (tenant_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS labs_agent_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        experiment_id uuid NOT NULL REFERENCES labs_experiments(id) ON DELETE CASCADE,
        scientist_id text NOT NULL,
        status text NOT NULL,
        summary text NULL,
        credits_used int NOT NULL DEFAULT 0,
        duration_ms int NULL,
        errors jsonb NULL,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS labs_findings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        experiment_id uuid NOT NULL REFERENCES labs_experiments(id) ON DELETE CASCADE,
        agent_run_id uuid NULL REFERENCES labs_agent_runs(id) ON DELETE SET NULL,
        scientist_id text NOT NULL,
        type text NOT NULL,
        value text NOT NULL,
        summary text NULL,
        confidence numeric NULL,
        evidence_count int NULL,
        metadata jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS labs_hypotheses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        experiment_id uuid NOT NULL REFERENCES labs_experiments(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text NOT NULL,
        confidence numeric NULL,
        market_evidence numeric NULL,
        client_evidence numeric NULL,
        competitor_evidence numeric NULL,
        trend_evidence numeric NULL,
        cost text NULL,
        effort text NULL,
        risk text NULL,
        expected_impact text NULL,
        recommended_next_step text NULL,
        rank int NULL,
        merged_to_brain boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS labs_credits_usage (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        experiment_id uuid NULL REFERENCES labs_experiments(id) ON DELETE SET NULL,
        scientist_id text NULL,
        credits int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS labs_credits_usage;`);
    await queryRunner.query(`DROP TABLE IF EXISTS labs_hypotheses;`);
    await queryRunner.query(`DROP TABLE IF EXISTS labs_findings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS labs_agent_runs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS labs_experiments;`);
  }
}
