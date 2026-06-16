import "server-only";

import { repositories } from "@/db/repositories";
import type { ClientNiche } from "@/lib/agency-brain/domain/schemas";

/** Static starter patterns per niche — supplemented by cross-tenant aggregation when opted in. */
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

async function getAggregatedNichePatterns(niche: ClientNiche): Promise<string[]> {
  const { clientLearning: learningRepo } = await repositories();

  const rows = await learningRepo
    .createQueryBuilder("l")
    .innerJoin("clients", "c", 'c.id = l."clientId"')
    .innerJoin("tenants", "t", 't.id = l."tenantId"')
    .select("l.title", "title")
    .addSelect("COUNT(*)", "cnt")
    .where("c.niche = :niche", { niche })
    .andWhere("l.status = :status", { status: "APPROVED" })
    .andWhere('t."agencyBrainNicheShareOptIn" = true')
    .groupBy("l.title")
    .orderBy("cnt", "DESC")
    .limit(5)
    .getRawMany<{ title: string; cnt: string }>();

  return rows.map(
    (r) => `Outras agências reportam: ${r.title} (${r.cnt}× no nicho)`
  );
}

export async function getNicheStarterInsights(niche: string | null | undefined): Promise<{
  niche: ClientNiche | null;
  patterns: string[];
  aggregated: boolean;
}> {
  const key = (niche ?? "") as ClientNiche;
  if (!key || !(key in NICHE_STARTER_PATTERNS)) {
    return { niche: null, patterns: [], aggregated: false };
  }

  const staticPatterns = NICHE_STARTER_PATTERNS[key];
  const aggregated = await getAggregatedNichePatterns(key);

  return {
    niche: key,
    patterns: [...staticPatterns, ...aggregated],
    aggregated: aggregated.length > 0
  };
}
