import "server-only";

import { formatMetaGraphError } from "@/lib/meta-error";
import { fetchCampaignInsightsForRange, pickLeads, pickResults } from "@/lib/meta-graph";
import { isMetaRateLimitMessage, isMetaRateLimitPayload } from "@/lib/meta-rate-limit";
import { num } from "@/lib/goal-types";

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
}): Promise<{ rows: CampaignMetricRow[]; enrichError?: string; rateLimited?: boolean }> {
  const byCampaign = new Map(input.rows.map((r) => [r.metaCampaignId, { ...r }]));
  let enrichError: string | undefined;
  let rateLimited = false;

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
      const insights = await fetchCampaignInsightsForRange(
        input.metaAccessToken,
        acc.metaAdAccountId,
        input.since,
        input.until
      );

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
      enrichError = formatMetaGraphError(e);
      const raw = e instanceof Error ? e.message : "";
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

  return { rows: [...byCampaign.values()], enrichError, rateLimited };
}
