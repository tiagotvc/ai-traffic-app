export type BigQueryAnalyticsParams = { clientId: string; dateFrom?: string; dateTo?: string };

/**
 * Provider tolerante a ausência de credenciais — a face de LEITURA do plano analítico.
 * O lado de escrita já existe: export incremental em `bq-export.ts` (cron `bq-export`),
 * cliente em `bigquery-client.ts`. Estes métodos de leitura serão implementados na
 * Fase 5 (benchmarking/memória longa do Brain) consultando o dataset `orion_analytics`
 * — nunca em caminho síncrono de request (docs/orion-architecture §5).
 */
export class BigQueryService {
  readonly enabled = process.env.ENABLE_BIGQUERY_ANALYTICS === "true";

  private async fetch<T>(_kind: string, _params: BigQueryAnalyticsParams): Promise<T[]> {
    if (!this.enabled) return [];
    try {
      // Ponto de integração futuro (Cloud Run/BigQuery). Nunca quebra o fluxo local.
      return [];
    } catch {
      return [];
    }
  }

  fetchCampaignMetrics(params: BigQueryAnalyticsParams) { return this.fetch("campaigns", params); }
  fetchAdSetMetrics(params: BigQueryAnalyticsParams) { return this.fetch("adsets", params); }
  fetchAdMetrics(params: BigQueryAnalyticsParams) { return this.fetch("ads", params); }
  fetchCreativePerformance(params: BigQueryAnalyticsParams) { return this.fetch("creatives", params); }
  fetchAudiencePerformance(params: BigQueryAnalyticsParams) { return this.fetch("audiences", params); }
}

export const bigQueryService = new BigQueryService();
