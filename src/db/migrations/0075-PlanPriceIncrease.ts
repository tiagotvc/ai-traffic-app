import type { MigrationInterface, QueryRunner } from "typeorm";

function yearlyListCents(monthlyCents: number): number {
  return monthlyCents * 12;
}

function asaasPatch(monthlyCents: number): string {
  return JSON.stringify({
    asaas: {
      monthlyCents,
      yearlyCents: yearlyListCents(monthlyCents)
    }
  });
}

/**
 * Reajuste aprovado após análise de mercado: o teto atual (Agency R$259,90)
 * custava, convertido, o mesmo que a entrada do comparável direto mais próximo
 * (AdEspresso, US$49–259). Sobe junto com a expansão do pool de créditos
 * (0074-CreditPoolExpansion) e antes da virada de chave que passa a cobrar
 * criação de campanha/anúncio/persona/zona/criativo.
 *
 * Usa merge (`COALESCE(...) || '{...}'::jsonb`) em vez de sobrescrever
 * `externalPrices` inteiro — preserva qualquer chave não-Asaas que exista.
 */
export class PlanPriceIncrease_1735940100000 implements MigrationInterface {
  name = "PlanPriceIncrease_1735940100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET
        "priceMonthlyCents" = 5990,
        "priceYearlyCents" = ${yearlyListCents(5990)},
        "externalPrices" = COALESCE("externalPrices", '{}'::jsonb) || '${asaasPatch(5990)}'::jsonb
      WHERE slug = 'basic';
    `);
    await queryRunner.query(`
      UPDATE plans SET
        "priceMonthlyCents" = 13990,
        "priceYearlyCents" = ${yearlyListCents(13990)},
        "externalPrices" = COALESCE("externalPrices", '{}'::jsonb) || '${asaasPatch(13990)}'::jsonb
      WHERE slug = 'advanced';
    `);
    await queryRunner.query(`
      UPDATE plans SET
        "priceMonthlyCents" = 37990,
        "priceYearlyCents" = ${yearlyListCents(37990)},
        "externalPrices" = COALESCE("externalPrices", '{}'::jsonb) || '${asaasPatch(37990)}'::jsonb
      WHERE slug = 'agency';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET
        "priceMonthlyCents" = 4990,
        "priceYearlyCents" = ${yearlyListCents(4990)},
        "externalPrices" = COALESCE("externalPrices", '{}'::jsonb) || '${asaasPatch(4990)}'::jsonb
      WHERE slug = 'basic';
    `);
    await queryRunner.query(`
      UPDATE plans SET
        "priceMonthlyCents" = 10990,
        "priceYearlyCents" = ${yearlyListCents(10990)},
        "externalPrices" = COALESCE("externalPrices", '{}'::jsonb) || '${asaasPatch(10990)}'::jsonb
      WHERE slug = 'advanced';
    `);
    await queryRunner.query(`
      UPDATE plans SET
        "priceMonthlyCents" = 25990,
        "priceYearlyCents" = ${yearlyListCents(25990)},
        "externalPrices" = COALESCE("externalPrices", '{}'::jsonb) || '${asaasPatch(25990)}'::jsonb
      WHERE slug = 'agency';
    `);
  }
}
