import "server-only";

/**
 * Orion Researcher — a porta única do Commander para fontes externas de pesquisa
 * (Fase 4, docs/orion-architecture §4). Scientists NÃO chamam fontes diretamente:
 * consomem o Researcher. Adicionar uma fonte nova (Google Ads, TikTok, Bing) é
 * implementar aqui — nenhum scientist muda.
 *
 * Fontes atuais (implementações vivem em `src/lib/labs/` até a migração de namespace
 * terminar; este módulo é o contrato):
 * - SearchAPI: SERP, Google Trends, YouTube, Google Maps (com orçamento diário
 *   compartilhado — use `canSpendSearchApi`/`recordSearchApiSpend`).
 * - Meta Ad Library: anúncios de concorrentes (com cache).
 * - Meta Reach Estimate: alcance por geografia.
 * - Cache de pesquisa com TTL (`researchCacheKey`/`getCachedResearch`/`setCachedResearch`).
 */

export {
  googleSerpFindings,
  googleTrendsFindings,
  youtubeFindings,
  googleMapsFindings
} from "@/lib/labs/searchapi-sources";

export { fetchAdLibraryCached } from "@/lib/labs/cached-ad-library";

export {
  researchCacheKey,
  getCachedResearch,
  setCachedResearch,
  canSpendSearchApi,
  recordSearchApiSpend,
  searchApiBudgetStatus
} from "@/lib/labs/market-research-cache";

export { estimateGeoReach } from "@/lib/labs/geo-reach";
