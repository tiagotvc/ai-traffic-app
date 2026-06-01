import "server-only";

import { fetchCampaignInsightsForRange, pickConversions, pickLeads } from "@/lib/meta-graph";
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

export async function enrichCampaignRowsFromMeta(input: {
  rows: CampaignMetricRow[];
  metaAccessToken: string;
  accounts: AccountRef[];
  since: string;
  until: string;
  skipIfHasSpend?: boolean;
}): Promise<{ rows: CampaignMetricRow[]; enrichError?: string }> {
  const byCampaign = new Map(input.rows.map((r) => [r.metaCampaignId, { ...r }]));
  let enrichError: string | undefined;

  for (const acc of input.accounts) {
    const needsEnrich = [...byCampaign.values()].some(
      (r) =>
        r.metaAdAccountId === acc.metaAdAccountId &&
        (!input.skipIfHasSpend || r.spend === 0)
    );
    if (!needsEnrich) continue;

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
        const conversions = pickConversions(row.actions);
        const leads = pickLeads(row.actions);
        const impressions = num(row.impressions);
        const clicks = num(row.clicks);
        const roas = num(row.purchase_roas?.[0]?.value);

        if (input.skipIfHasSpend && existing.spend > 0 && spend === 0) continue;

        existing.spend = spend || existing.spend;
        existing.conversions = conversions || existing.conversions;
        existing.leads = leads || existing.leads;
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
      enrichError = e instanceof Error ? e.message : String(e);
    }
  }

  return { rows: [...byCampaign.values()], enrichError };
}
