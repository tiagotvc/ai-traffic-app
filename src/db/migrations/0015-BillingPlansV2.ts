import type { MigrationInterface, QueryRunner } from "typeorm";

export class BillingPlansV2_1735691200000 implements MigrationInterface {
  name = "BillingPlansV2_1735691200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS "trialDays" int NOT NULL DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
    `);

    await queryRunner.query(`UPDATE plans SET "isActive" = false WHERE slug = 'pro';`);

    await queryRunner.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "planId" uuid REFERENCES plans(id);
    `);

    const freeLimits = JSON.stringify({
      maxClients: 2,
      maxAdAccounts: 3,
      maxMembers: 1,
      maxAutomationRules: 0,
      maxAiRequestsPerMonth: 10,
      maxScheduledReports: 0,
      allowAutoSync: false,
      allowLiveMeta: false
    });
    const basicLimits = JSON.stringify({
      maxClients: 3,
      maxAdAccounts: 10,
      maxMembers: 2,
      maxAutomationRules: 3,
      maxAiRequestsPerMonth: 30,
      maxScheduledReports: 1,
      allowAutoSync: true,
      allowLiveMeta: false
    });
    const advancedLimits = JSON.stringify({
      maxClients: 10,
      maxAdAccounts: 30,
      maxMembers: 5,
      maxAutomationRules: 10,
      maxAiRequestsPerMonth: 100,
      maxScheduledReports: 5,
      allowAutoSync: true,
      allowLiveMeta: true
    });
    const agencyLimits = JSON.stringify({
      maxClients: 50,
      maxAdAccounts: 150,
      maxMembers: 15,
      maxAutomationRules: 50,
      maxAiRequestsPerMonth: 500,
      maxScheduledReports: 20,
      allowAutoSync: true,
      allowLiveMeta: true
    });

    await queryRunner.query(`
      INSERT INTO plans (slug, name, description, "priceMonthlyCents", "priceYearlyCents", limits, "sortOrder", "trialDays", currency, "isActive")
      VALUES
        ('free', 'Free', 'Teste completo por 7 dias', 0, 0, '${freeLimits}'::jsonb, 0, 7, 'USD', true),
        ('basic', 'Basic', 'Para freelancers e gestores solo', 2000, 20000, '${basicLimits}'::jsonb, 1, 0, 'USD', true),
        ('advanced', 'Advanced', 'Para agências em crescimento', 6000, 60000, '${advancedLimits}'::jsonb, 2, 0, 'USD', true),
        ('agency', 'Agency', 'Operação multi-cliente em escala', 20000, 200000, '${agencyLimits}'::jsonb, 3, 0, 'USD', true)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        "priceMonthlyCents" = EXCLUDED."priceMonthlyCents",
        "priceYearlyCents" = EXCLUDED."priceYearlyCents",
        limits = EXCLUDED.limits,
        "sortOrder" = EXCLUDED."sortOrder",
        "trialDays" = EXCLUDED."trialDays",
        currency = EXCLUDED.currency,
        "isActive" = EXCLUDED."isActive";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE plans SET "isActive" = false WHERE slug IN ('basic','advanced','agency');`);
    await queryRunner.query(`ALTER TABLE plans DROP COLUMN IF EXISTS "trialDays";`);
    await queryRunner.query(`ALTER TABLE plans DROP COLUMN IF EXISTS currency;`);
  }
}
