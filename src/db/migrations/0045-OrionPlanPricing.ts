import type { MigrationInterface, QueryRunner } from "typeorm";

function yearlyListCents(monthlyCents: number): number {
  return monthlyCents * 12;
}

function asaasJson(monthlyCents: number): string {
  return JSON.stringify({
    asaas: {
      monthlyCents,
      yearlyCents: yearlyListCents(monthlyCents)
    }
  });
}

export class OrionPlanPricing_1735831500000 implements MigrationInterface {
  name = "OrionPlanPricing_1735831500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const individualLimits = JSON.stringify({
      maxClients: 5,
      maxAdAccounts: 15,
      maxMembers: 2,
      maxAutomationRules: 5,
      maxAiRequestsPerMonth: 50,
      maxScheduledReports: 2,
      allowAutoSync: true,
      allowLiveMeta: false
    });

    const advancedProLimits = JSON.stringify({
      maxClients: 20,
      maxAdAccounts: 60,
      maxMembers: 8,
      maxAutomationRules: 20,
      maxAiRequestsPerMonth: 200,
      maxScheduledReports: 10,
      allowAutoSync: true,
      allowLiveMeta: true
    });

    const agencyProLimits = JSON.stringify({
      maxClients: 100,
      maxAdAccounts: 300,
      maxMembers: 25,
      maxAutomationRules: 100,
      maxAiRequestsPerMonth: 1000,
      maxScheduledReports: 50,
      allowAutoSync: true,
      allowLiveMeta: true
    });

    await queryRunner.query(`
      UPDATE plans SET
        name = 'Individual',
        description = 'Para gestores solo que querem sair das planilhas',
        "priceMonthlyCents" = 4990,
        "priceYearlyCents" = ${yearlyListCents(4990)},
        currency = 'BRL',
        "externalPrices" = '${asaasJson(4990)}'::jsonb,
        limits = '${individualLimits}'::jsonb,
        "sortOrder" = 1
      WHERE slug = 'basic';
    `);

    await queryRunner.query(`
      UPDATE plans SET
        name = 'Advanced',
        description = 'Para agências em crescimento',
        "priceMonthlyCents" = 10990,
        "priceYearlyCents" = ${yearlyListCents(10990)},
        currency = 'BRL',
        "externalPrices" = '${asaasJson(10990)}'::jsonb,
        "sortOrder" = 2
      WHERE slug = 'advanced';
    `);

    await queryRunner.query(`
      UPDATE plans SET
        name = 'Agency',
        description = 'Operação multi-cliente em escala',
        "priceMonthlyCents" = 25990,
        "priceYearlyCents" = ${yearlyListCents(25990)},
        currency = 'BRL',
        "externalPrices" = '${asaasJson(25990)}'::jsonb,
        "sortOrder" = 4
      WHERE slug = 'agency';
    `);

    await queryRunner.query(`
      INSERT INTO plans (slug, name, description, "priceMonthlyCents", "priceYearlyCents", limits, "sortOrder", "trialDays", currency, "isActive", "externalPrices")
      VALUES
        (
          'advanced-pro',
          'Advanced Pro',
          'Mais clientes, IA e automações para agências acelerando',
          15990,
          ${yearlyListCents(15990)},
          '${advancedProLimits}'::jsonb,
          3,
          0,
          'BRL',
          true,
          '${asaasJson(15990)}'::jsonb
        ),
        (
          'agency-pro',
          'Agency Pro',
          'Escala máxima para operações de alto volume',
          49990,
          ${yearlyListCents(49990)},
          '${agencyProLimits}'::jsonb,
          5,
          0,
          'BRL',
          true,
          '${asaasJson(49990)}'::jsonb
        )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        "priceMonthlyCents" = EXCLUDED."priceMonthlyCents",
        "priceYearlyCents" = EXCLUDED."priceYearlyCents",
        limits = EXCLUDED.limits,
        "sortOrder" = EXCLUDED."sortOrder",
        currency = EXCLUDED.currency,
        "isActive" = EXCLUDED."isActive",
        "externalPrices" = EXCLUDED."externalPrices";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE plans SET "isActive" = false WHERE slug IN ('advanced-pro', 'agency-pro');`);
  }
}
