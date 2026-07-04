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

/* ------------------------------------------------------------------------------------
 * Orion Research — contrato de fontes plugáveis (docs/orion-research).
 *
 * Toda fonte implementa o mesmo shape e grava no MESMO artefato (research_findings):
 * o Cortex consome "achados", nunca fontes. Adicionar TikTok/Reddit/LinkedIn amanhã é
 * implementar uma fonte nova — nada mais muda. `creditCost` é a base do modelo de
 * add-on por créditos (1 crédito ≈ 1 chamada de fonte com síntese).
 * ---------------------------------------------------------------------------------- */

export type ResearchSourceId =
  | "meta_ad_library"
  | "google_serp"
  | "google_trends"
  | "youtube"
  | "google_maps"
  | "news"
  | "tiktok_creative_center"
  | "reddit"
  | "shopify"
  | "amazon"
  | "mercado_livre"
  | "linkedin";

export type ResearchSourceDef = {
  id: ResearchSourceId;
  label: string;
  /** Fase do roadmap de fontes (1 = já implementada/implementável hoje). */
  phase: 1 | 2 | 3 | 4;
  /** Custo em créditos por execução (base do add-on Orion Research). */
  creditCost: number;
  /** Implementada e utilizável hoje. */
  available: boolean;
};

export const RESEARCH_SOURCES: ResearchSourceDef[] = [
  { id: "meta_ad_library", label: "Meta Ad Library", phase: 1, creditCost: 1, available: true },
  { id: "google_serp", label: "Google (SERP)", phase: 1, creditCost: 1, available: true },
  { id: "google_trends", label: "Google Trends", phase: 1, creditCost: 1, available: true },
  { id: "youtube", label: "YouTube", phase: 1, creditCost: 1, available: true },
  { id: "google_maps", label: "Google Maps", phase: 1, creditCost: 1, available: true },
  { id: "news", label: "Notícias", phase: 1, creditCost: 1, available: false },
  { id: "tiktok_creative_center", label: "TikTok Creative Center", phase: 2, creditCost: 2, available: false },
  { id: "reddit", label: "Reddit", phase: 2, creditCost: 1, available: false },
  { id: "shopify", label: "Shopify Stores", phase: 3, creditCost: 2, available: false },
  { id: "amazon", label: "Amazon", phase: 3, creditCost: 2, available: false },
  { id: "mercado_livre", label: "Mercado Livre", phase: 3, creditCost: 2, available: false },
  { id: "linkedin", label: "LinkedIn", phase: 4, creditCost: 2, available: false }
];

export type ResearchFindingDraft = {
  source: ResearchSourceId | string;
  category:
    | "competitor"
    | "trend"
    | "creative"
    | "offer"
    | "audience"
    | "news"
    | "product"
    | "other";
  /** O que foi pesquisado: nicho, concorrente, query, produto. */
  entity: string;
  title?: string | null;
  summary: string;
  confidence?: number | null;
  evidence?: Record<string, unknown> | null;
  researchJobId?: string | null;
};

/**
 * Persiste achados de pesquisa no artefato genérico (best-effort — pesquisa nunca
 * derruba o fluxo que a chamou). É por aqui que a memória do Orion acumula sinais
 * externos, independentemente da fonte.
 */
export async function recordResearchFindings(
  tenantId: string,
  clientId: string | null,
  findings: ResearchFindingDraft[]
): Promise<void> {
  if (!findings.length) return;
  try {
    const { repositories } = await import("@/db/repositories");
    const { researchFinding: repo } = await repositories();
    await repo.save(
      findings.slice(0, 50).map((f) =>
        repo.create({
          tenantId,
          clientId,
          source: f.source,
          category: f.category,
          entity: f.entity.slice(0, 300),
          title: f.title ?? null,
          summary: f.summary.slice(0, 2000),
          confidence: f.confidence != null ? String(Math.round(f.confidence * 100) / 100) : null,
          evidence: f.evidence ?? null,
          researchJobId: f.researchJobId ?? null
        })
      )
    );
  } catch (err) {
    console.error("[researcher] recordResearchFindings failed", err);
  }
}
