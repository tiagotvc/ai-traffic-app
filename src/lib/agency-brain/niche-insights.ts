import "server-only";

import type { ClientNiche } from "@/lib/agency-brain/domain/schemas";

/** Static starter patterns per niche — cross-tenant aggregation (opt-in) is Phase 6+. */
const NICHE_STARTER_PATTERNS: Record<ClientNiche, string[]> = {
  clinica: [
    "Depoimentos e autoridade médica tendem a performar melhor que produto isolado.",
    "Mulheres 25–44 costumam converter melhor em procedimentos estéticos.",
    "Vídeos curtos (15–25s) com prova social geram CTR superior."
  ],
  ecommerce: [
    "Oferta clara + produto em uso costuma superar foto de catálogo.",
    "Remarketing com urgência moderada tende a elevar ROAS.",
    "Carrosséis com benefícios diretos performam bem no feed."
  ],
  infoproduto: [
    "Urgência + prova social combinadas elevam conversão em lançamentos.",
    "VSL curta (até 3 min) no topo do funil costuma reduzir CPA.",
    "Depoimentos em UGC convertem melhor que estúdio."
  ],
  imobiliaria: [
    "Tour virtual e localização no criativo aumentam engajamento.",
    "Público lookalike de leads qualificados reduz CPA.",
    "Stories com imóvel em destaque geram leads mais baratos."
  ],
  saas: [
    "Demo do produto em vídeo curto tende a melhorar trial signup.",
    "Case studies B2B performam melhor que criativos genéricos.",
    "LinkedIn/Meta com dor + solução funciona para ICP definido."
  ],
  apps_games: [
    "Gameplay real nos primeiros 3 segundos reduz CPI.",
    "Criativos verticais para stories/reels tendem a escalar melhor.",
    "Testes A/B de hook nos primeiros frames impactam CTR."
  ],
  outro: ["Defina o nicho do cliente para receber padrões de mercado sugeridos."]
};

export function getNicheStarterInsights(niche: string | null | undefined): {
  niche: ClientNiche | null;
  patterns: string[];
  aggregated: boolean;
} {
  const key = (niche ?? "") as ClientNiche;
  if (!key || !(key in NICHE_STARTER_PATTERNS)) {
    return { niche: null, patterns: [], aggregated: false };
  }
  return {
    niche: key,
    patterns: NICHE_STARTER_PATTERNS[key],
    aggregated: false
  };
}
