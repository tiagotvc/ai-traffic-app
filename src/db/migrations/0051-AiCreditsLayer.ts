import type { MigrationInterface, QueryRunner } from "typeorm";

export class AiCreditsLayer_1735832100000 implements MigrationInterface {
  name = "AiCreditsLayer_1735832100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL DEFAULT '{}',
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO platform_settings (key, value)
      VALUES (
        'ai_credits_feature_flags',
        '{"creditsV2Enabled":false,"tenantPolicyUiEnabled":false,"perClientCapsEnabled":false,"agentLayerEnabled":false}'::jsonb
      )
      ON CONFLICT (key) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO platform_settings (key, value)
      VALUES (
        'ai_credit_weights',
        '{"chat":1,"chat_with_proposals":3,"learnings":1,"actions":1,"hypotheses":1,"recommendations":1,"audience_suggestions":1,"campaign_generate":2,"generic":1}'::jsonb
      )
      ON CONFLICT (key) DO NOTHING;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_ai_policies (
        "tenantId" uuid PRIMARY KEY,
        "distributionMode" text NOT NULL DEFAULT 'shared_pool',
        "alertThresholdPercent" int NOT NULL DEFAULT 80,
        "reservePercent" int NOT NULL DEFAULT 0,
        "defaultClientMonthlyCap" int NULL,
        "customWeights" jsonb NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE client_meta_settings
        ADD COLUMN IF NOT EXISTS "aiEnabled" bool NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "aiMonthlyCap" int NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE ai_recommendations
        ADD COLUMN IF NOT EXISTS "creditsCharged" int NOT NULL DEFAULT 1;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ai_recommendations_tenant_client_month"
        ON ai_recommendations ("tenantId", "clientId", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_recommendations_tenant_client_month";`);
    await queryRunner.query(`ALTER TABLE ai_recommendations DROP COLUMN IF EXISTS "creditsCharged";`);
    await queryRunner.query(`
      ALTER TABLE client_meta_settings
        DROP COLUMN IF EXISTS "aiEnabled",
        DROP COLUMN IF EXISTS "aiMonthlyCap";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_ai_policies;`);
    await queryRunner.query(`DELETE FROM platform_settings WHERE key IN ('ai_credits_feature_flags', 'ai_credit_weights');`);
    await queryRunner.query(`DROP TABLE IF EXISTS platform_settings;`);
  }
}
