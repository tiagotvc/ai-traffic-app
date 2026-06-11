import {
  fetchAdInsightsForAccount,
  fetchAdInsightsForCampaign,
  fetchAdsWithUsageForAccount,
  fetchAdsWithUsageForCampaign,
  type AdInsightMetrics,
  type AdUsageRow
} from "@/lib/meta-graph";

/**
 * Busca os anúncios de uma conta tentando cada token (primário e fallback).
 * Se um token não tem acesso à conta, a chamada lança — então tentamos o próximo,
 * em vez de descartar a conta silenciosamente.
 */
export async function fetchAdsForAccountAnyToken(
  tokens: Array<string | null | undefined>,
  accountId: string
): Promise<{ ads: AdUsageRow[]; ok: boolean; errors: number }> {
  let errors = 0;
  for (const token of tokens) {
    if (!token) continue;
    try {
      const ads = await fetchAdsWithUsageForAccount(token, accountId);
      return { ads, ok: true, errors };
    } catch {
      errors += 1;
    }
  }
  return { ads: [], ok: false, errors };
}

/** Insights por anúncio tentando cada token; o primeiro que retornar dados vence. */
export async function fetchInsightsForAccountAnyToken(
  tokens: Array<string | null | undefined>,
  accountId: string,
  opts?: { since?: string | null; until?: string | null }
): Promise<Map<string, AdInsightMetrics>> {
  let last: Map<string, AdInsightMetrics> = new Map();
  for (const token of tokens) {
    if (!token) continue;
    const m = await fetchAdInsightsForAccount(token, accountId, opts);
    if (m.size) return m;
    last = m;
  }
  return last;
}

/** Anúncios de uma CAMPANHA tentando cada token. */
export async function fetchAdsForCampaignAnyToken(
  tokens: Array<string | null | undefined>,
  campaignId: string
): Promise<{ ads: AdUsageRow[]; ok: boolean; errors: number }> {
  let errors = 0;
  for (const token of tokens) {
    if (!token) continue;
    try {
      const ads = await fetchAdsWithUsageForCampaign(token, campaignId);
      return { ads, ok: true, errors };
    } catch {
      errors += 1;
    }
  }
  return { ads: [], ok: false, errors };
}

/** Insights por anúncio de uma CAMPANHA tentando cada token. */
export async function fetchInsightsForCampaignAnyToken(
  tokens: Array<string | null | undefined>,
  campaignId: string
): Promise<Map<string, AdInsightMetrics>> {
  let last: Map<string, AdInsightMetrics> = new Map();
  for (const token of tokens) {
    if (!token) continue;
    const m = await fetchAdInsightsForCampaign(token, campaignId);
    if (m.size) return m;
    last = m;
  }
  return last;
}
