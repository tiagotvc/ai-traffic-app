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

/** "Individual" era o único plano sem uma variante Plus/Pro (Advanced→Advanced Pro e Agency→Agency
 * Pro já existiam). Números aprovados: $79,90/mês, 10 clientes, 100 créditos de IA — mesma
 * proporção (~2x) usada nos outros pares base→pro já existentes. */
export class IndividualPlusPlan_1735832900000 implements MigrationInterface {
  name = "IndividualPlusPlan_1735832900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const limits = JSON.stringify({
      maxClients: 10,
      maxAdAccounts: 30,
      maxMembers: 4,
      maxAutomationRules: 10,
      maxAiRequestsPerMonth: 100,
      maxScheduledReports: 4,
      allowAutoSync: true,
      allowLiveMeta: true
    });

    await queryRunner.query(`
      INSERT INTO plans (slug, name, description, "priceMonthlyCents", "priceYearlyCents", limits, "sortOrder", "trialDays", currency, "isActive", "externalPrices")
      VALUES (
        'basic-plus',
        'Individual Plus',
        'Mais clientes e créditos de IA para quem está crescendo sozinho',
        7990,
        ${yearlyListCents(7990)},
        '${limits}'::jsonb,
        6,
        0,
        'BRL',
        true,
        '${asaasJson(7990)}'::jsonb
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
    await queryRunner.query(`UPDATE plans SET "isActive" = false WHERE slug = 'basic-plus';`);
  }
}
