export type BigQueryAnalyticsParams = { clientId: string; dateFrom?: string; dateTo?: string };

/**
 * Provider tolerante a ausência de credenciais. A implementação real pode ser
 * injetada sem acoplar o Campaign Creator ao SDK do BigQuery.
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
