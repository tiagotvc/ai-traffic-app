import "server-only";

import { cache } from "react";

import { repositories } from "@/db/repositories";

export type TrialLandingPricing = {
  /** Menor mensalidade paga, já formatada na moeda do plano. `null` se não der pra ler. */
  entryPrice: string | null;
  /** Dias de teste do plano free. Cai em 7 se o plano sumir. */
  trialDays: number;
};

const DEFAULT_TRIAL_DAYS = 7;

function formatPrice(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "BRL",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

/**
 * Preço de entrada e duração do trial para a landing de campanha, lidos dos planos ativos.
 *
 * Existe porque preço em arquivo de tradução envelhece calado: a tabela muda, a landing
 * de anúncio continua prometendo o valor antigo e a promessa quebra no checkout.
 *
 * Nunca lança. Se o banco não responder, a página ainda renderiza sem a linha de preço:
 * tráfego pago não pode bater numa tela de erro por causa de uma consulta de vitrine.
 *
 * `cache` do React só deduplica dentro do mesmo request, que já basta aqui (a página lê
 * uma vez).
 */
export const getTrialLandingPricing = cache(
  async (locale: string): Promise<TrialLandingPricing> => {
    try {
      const { plan: planRepo } = await repositories();
      const plans = await planRepo.find({ where: { isActive: true } });

      const paid = plans
        .filter((p) => (p.priceMonthlyCents ?? 0) > 0)
        .sort((a, b) => a.priceMonthlyCents - b.priceMonthlyCents);

      const cheapest = paid[0];
      const free = plans.find((p) => p.slug === "free");

      return {
        entryPrice: cheapest
          ? formatPrice(cheapest.priceMonthlyCents, cheapest.currency, locale)
          : null,
        trialDays: free?.trialDays || DEFAULT_TRIAL_DAYS
      };
    } catch (err) {
      console.error("[trial-landing] falha ao ler planos:", err);
      return { entryPrice: null, trialDays: DEFAULT_TRIAL_DAYS };
    }
  }
);
