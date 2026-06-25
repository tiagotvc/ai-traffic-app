import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { resolveDashboardScope } from "@/lib/dashboard-query";
import { fetchInsightsWithBreakdowns, pickConversions, pickResults } from "@/lib/meta-graph";

export const AGE_BUCKETS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

export const AGE_COLORS: Record<string, string> = {
  "18-24": "#f5a623",
  "25-34": "#7c3aed",
  "35-44": "#10b981",
  "45-54": "#1e40af",
  "55-64": "#ec4899",
  "65+": "#38bdf8"
};

export type AgeBreakdownRow = {
  segment: string;
  spend: number;
  sharePct: number;
  conversions: number;
  cpa: number | null;
  color: string;
};

function datePresetFromDays(days: number): string {
  if (days <= 7) return "last_7d";
  if (days <= 14) return "last_14d";
  return "last_30d";
}

function periodDaysBucket(days: number): number {
  if (days <= 7) return 7;
  if (days <= 14) return 14;
  return 30;
}

function emptyBuckets() {
  const aggregated = new Map<string, { spend: number; conversions: number }>();
  for (const bucket of AGE_BUCKETS) {
    aggregated.set(bucket, { spend: 0, conversions: 0 });
  }
  return aggregated;
}

export async function loadAgeBreakdown(input: {
  tenantId: string;
  userId: string;
  clientId?: string | null;
  adAccountId?: string | null;
  days: number;
}): Promise<AgeBreakdownRow[]> {
  const { adAccounts } = await resolveDashboardScope(
    input.tenantId,
    input.clientId,
    input.adAccountId
  );
  if (!adAccounts.length) return [];

  const aggregated = emptyBuckets();
  const datePreset = datePresetFromDays(input.days);
  const { metaAccessToken } = await resolveMetaTokensForApi(input.tenantId, input.userId, null);

  if (metaAccessToken) {
    for (const account of adAccounts) {
      try {
        const rows = await fetchInsightsWithBreakdowns(
          metaAccessToken,
          account.metaAdAccountId,
          ["age"],
          datePreset,
          "campaign"
        );
        for (const row of rows) {
          const age = String(row.age ?? "");
          if (!age || !aggregated.has(age)) continue;
          const spend = Number(row.spend ?? 0);
          const conversions = pickConversions(row.actions) || pickResults(row) || 0;
          const prev = aggregated.get(age)!;
          aggregated.set(age, {
            spend: prev.spend + spend,
            conversions: prev.conversions + conversions
          });
        }
      } catch {
        /* skip account */
      }
    }
  }

  const totalSpendLive = [...aggregated.values()].reduce((sum, row) => sum + row.spend, 0);
  if (totalSpendLive <= 0) {
    const { audienceInsightBreakdown: repo } = await repositories();
    const periodDays = periodDaysBucket(input.days);
    const clientIds = [...new Set(adAccounts.map((a) => a.clientId))];
    const metaIds = adAccounts.map((a) => a.metaAdAccountId);
    const dbRows = await repo.find({
      where: {
        clientId: In(clientIds),
        metaAdAccountId: In(metaIds),
        breakdownType: "age",
        periodDays
      }
    });
    for (const row of dbRows) {
      if (!aggregated.has(row.breakdownValue)) continue;
      const spend = Number(row.spend);
      const conversions = Number(row.conversions);
      const prev = aggregated.get(row.breakdownValue)!;
      aggregated.set(row.breakdownValue, {
        spend: prev.spend + spend,
        conversions: prev.conversions + conversions
      });
    }
  }

  const totalSpend = [...aggregated.values()].reduce((sum, row) => sum + row.spend, 0);

  return AGE_BUCKETS.map((segment) => {
    const agg = aggregated.get(segment)!;
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
    return {
      segment,
      spend: agg.spend,
      sharePct: totalSpend > 0 ? (agg.spend / totalSpend) * 100 : 0,
      conversions: agg.conversions,
      cpa,
      color: AGE_COLORS[segment] ?? "#94a3b8"
    };
  });
}
