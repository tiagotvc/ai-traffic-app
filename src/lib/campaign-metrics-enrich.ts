import "server-only";

import {
  fetchCampaignInsightsForRange,
  pickLeads,
  pickResults,
  type MetaCampaignInsightRow
} from "@/lib/meta-graph";
import {
  getCachedCampaignInsights,
  setCachedCampaignInsights
} from "@/lib/meta-insights-cache";
import { isMetaRateLimitMessage, isMetaRateLimitPayload } from "@/lib/meta-rate-limit";
import { num } from "@/lib/goal-types";
import { formatMetaGraphError } from "@/lib/meta-error";
import { isMetaPermissionError } from "@/lib/meta-auth-store";

export type CampaignMetricRow = {
  metaCampaignId: string;
  campaignName: string;
  clientId: string;
  clientName: string;
  clientSlug: string;
  clientTag: string | null;
  adAccountId: string;
  accountLabel: string;
  metaAdAccountId: string;
  spend: number;
  conversions: number;
  leads: number;
  cpl: number | null;
  cpa: number | null;
  roas: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  status?: string;
  objective?: string | null;
  alertCount: number;
  hasAlert: boolean;
  dailyBudget?: number | null;
};

type AccountRef = { id: string; metaAdAccountId: string };

function accountHasCampaignRows(rows: CampaignMetricRow[], metaAdAccountId: string) {
  return rows.some((r) => r.metaAdAccountId === metaAdAccountId);
}

export async function enrichCampaignRowsFromMeta(input: {
  rows: CampaignMetricRow[];
  metaAccessToken: string;
  accounts: AccountRef[];
  since: string;
  until: string;
  skipIfHasSpend?: boolean;
  tenantId?: string;
  refresh?: boolean;
}): Promise<{
  rows: CampaignMetricRow[];
  enrichError?: string;
  rateLimited?: boolean;
  permissionDenied?: boolean;
  fromCache?: boolean;
  cachedAt?: string | null;
}> {
  const byCampaign = new Map(input.rows.map((r) => [r.metaCampaignId, { ...r }]));
  let enrichError: string | undefined;
  let rateLimited = false;
  let permissionDenied = false;
  let fromCache = false;
  let latestCachedAt: number | null = null;

  const accounts = input.accounts.filter((a) => accountHasCampaignRows(input.rows, a.metaAdAccountId));

  for (const acc of accounts) {
    if (rateLimited) break;

    if (input.skipIfHasSpend) {
      const rowsForAcc = input.rows.filter((r) => r.metaAdAccountId === acc.metaAdAccountId);
      if (rowsForAcc.length > 0 && rowsForAcc.every((r) => (r.spend ?? 0) > 0)) {
        continue;
      }
    }

    try {
      let insights: MetaCampaignInsightRow[] | undefined;
      const tenantId = input.tenantId?.trim();
      if (tenantId && !input.refresh) {
        const cached = getCachedCampaignInsights(
          tenantId,
          acc.metaAdAccountId,
          input.since,
          input.until
        );
        if (cached) {
          insights = cached.insights;
          fromCache = true;
          latestCachedAt = Math.max(latestCachedAt ?? 0, cached.cachedAt);
        }
      }
      if (!insights) {
        insights = await fetchCampaignInsightsForRange(
          input.metaAccessToken,
          acc.metaAdAccountId,
          input.since,
          input.until
        );
        if (tenantId) {
          setCachedCampaignInsights(
            tenantId,
            acc.metaAdAccountId,
            input.since,
            input.until,
            insights
          );
        }
      }

      for (const row of insights) {
        const id = row.campaign_id;
        if (!id) continue;
        const existing = byCampaign.get(id);
        if (!existing) continue;
        if (existing.metaAdAccountId !== acc.metaAdAccountId) continue;

        const spend = num(row.spend);
        const conversions = pickResults(row);
        const leads = pickLeads(row.actions);
        const impressions = num(row.impressions);
        const clicks = num(row.clicks);
        const roas = num(row.purchase_roas?.[0]?.value);

        if (spend > 0 || !input.skipIfHasSpend) existing.spend = spend;
        else if (existing.spend === 0) existing.spend = spend;

        existing.conversions = conversions;
        existing.leads = leads;
        existing.cpl = existing.leads > 0 ? existing.spend / existing.leads : null;
        existing.cpa = existing.conversions > 0 ? existing.spend / existing.conversions : null;
        existing.roas = roas || existing.roas;
        existing.impressions = impressions;
        existing.clicks = clicks;
        existing.ctr = num(row.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0);
        existing.cpc = num(row.cpc) || (clicks > 0 ? existing.spend / clicks : 0);
        existing.cpm = impressions > 0 ? (existing.spend / impressions) * 1000 : 0;
        if (row.campaign_name) existing.campaignName = row.campaign_name;
        byCampaign.set(id, existing);
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);

      // Erro de permissão é POR CONTA: o token vê a conta mas não tem ads_read/
      // ads_management nela. Pula a conta silenciosamente (sinaliza p/ fallback de
      // token) em vez de contaminar a tela com o 403 cru.
      if (isMetaPermissionError(raw)) {
        permissionDenied = true;
        continue;
      }

      enrichError = formatMetaGraphError(e);
      let payloadRateLimit = false;
      const jsonStart = raw.indexOf("{");
      if (jsonStart >= 0) {
        try {
          payloadRateLimit = isMetaRateLimitPayload(JSON.parse(raw.slice(jsonStart)));
        } catch {
          /* ignore */
        }
      }
      rateLimited = payloadRateLimit || isMetaRateLimitMessage(enrichError) || isMetaRateLimitMessage(raw);
      if (rateLimited) break;
    }
  }

  return {
    rows: [...byCampaign.values()],
    enrichError,
    rateLimited,
    permissionDenied,
    fromCache: fromCache || undefined,
    cachedAt: latestCachedAt ? new Date(latestCachedAt).toISOString() : null
  };
}
