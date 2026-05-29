import { MigrationInterface, QueryRunner } from "typeorm";

export class AgencyPlatform1735690200000 implements MigrationInterface {
  name = "AgencyPlatform1735690200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_meta_settings (
        "clientId" uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
        "defaultAdAccountId" text NULL,
        "metaPixelId" text NULL,
        "metaLeadFormId" text NULL,
        "instagramActorId" text NULL,
        "defaultObjective" text NOT NULL DEFAULT 'leads',
        "defaultCta" text NOT NULL DEFAULT 'LEARN_MORE',
        "defaultDailyBudgetBrl" numeric(18,2) NULL,
        "targeting" jsonb NOT NULL DEFAULT '{"countries":["BR"],"age_min":18,"age_max":65,"languages":[]}',
        "specialAdCategories" jsonb NOT NULL DEFAULT '[]',
        "campaignNamePrefix" text NULL,
        "syncEnabled" boolean NOT NULL DEFAULT true,
        "syncPriority" text NOT NULL DEFAULT 'normal',
        "defaultCustomAudienceIds" jsonb NOT NULL DEFAULT '[]',
        "defaultExcludedAudienceIds" jsonb NOT NULL DEFAULT '[]',
        "automationEnabled" boolean NOT NULL DEFAULT false,
        "targetingTemplateName" text NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sync_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        status text NOT NULL DEFAULT 'pending',
        "accountsTotal" int NOT NULL DEFAULT 0,
        "accountsDone" int NOT NULL DEFAULT 0,
        "lastError" text NULL,
        "startedAt" timestamptz NULL,
        "finishedAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sync_runs_tenant ON sync_runs("tenantId");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sync_queue_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        "syncRunId" uuid NULL REFERENCES sync_runs(id) ON DELETE SET NULL,
        "adAccountId" uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
        "metaAdAccountId" text NOT NULL,
        priority int NOT NULL DEFAULT 50,
        status text NOT NULL DEFAULT 'pending',
        attempts int NOT NULL DEFAULT 0,
        "lastError" text NULL,
        "scheduledAt" timestamptz NOT NULL DEFAULT now(),
        "processedAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue_jobs(status, "scheduledAt");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_sync_state (
        "tenantId" uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
        "lastManualSyncAt" timestamptz NULL,
        "activeSyncRunId" uuid NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saved_views (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        "userId" uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        name text NOT NULL,
        filters jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        tag text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE("clientId", tag)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_client_tags_tag ON client_tags(tag);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meta_audience_cache (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "metaAdAccountId" text NOT NULL,
        audiences jsonb NOT NULL DEFAULT '[]',
        "fetchedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE("metaAdAccountId")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lookalike_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        "metaAdAccountId" text NOT NULL,
        name text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        "seedType" text NOT NULL,
        "seedId" text NULL,
        ratio numeric(5,4) NOT NULL DEFAULT 0.01,
        country text NOT NULL DEFAULT 'BR',
        "metaAudienceId" text NULL,
        "lastError" text NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campaign_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clientId" uuid NULL REFERENCES clients(id) ON DELETE CASCADE,
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creative_assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        "metaAdAccountId" text NOT NULL,
        "metaImageHash" text NULL,
        label text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        "clientId" uuid NULL REFERENCES clients(id) ON DELETE CASCADE,
        name text NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        condition jsonb NOT NULL,
        action jsonb NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_clients (
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "clientId" uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'gestor',
        PRIMARY KEY ("userId", "clientId")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_camp_metrics_campaign ON campaign_metric_snapshots("metaCampaignId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_tenant_dismissed ON alerts("tenantId", dismissed);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_clients;`);
    await queryRunner.query(`DROP TABLE IF EXISTS automation_rules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS creative_assets;`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaign_templates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS lookalike_jobs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS meta_audience_cache;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_tags;`);
    await queryRunner.query(`DROP TABLE IF EXISTS saved_views;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_sync_state;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sync_queue_jobs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sync_runs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_meta_settings;`);
  }
}
