import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { resolveDashboardScope } from "@/lib/dashboard-query";
import { fetchInsightsWithBreakdowns, pickConversions, pickResults } from "@/lib/meta-graph";
import { getBreakdown } from "@/lib/google-ads-api";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { isGoogleAdsEnabled } from "@/lib/google-env";

/** Faixas de idade do Google (age_range_view) mapeadas para os buckets do card. */
const GOOGLE_AGE_MAP: Record<string, string> = {
  AGE_RANGE_18_24: "18-24",
  AGE_RANGE_25_34: "25-34",
  AGE_RANGE_35_44: "35-44",
  AGE_RANGE_45_54: "45-54",
  AGE_RANGE_55_64: "55-64",
  AGE_RANGE_65_UP: "65+"
};

function rangeFromDays(days: number): { since: string; until: string } {
  const until = new Date();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (Math.max(1, days) - 1));
  return { since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) };
}

export const AGE_BUCKETS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

export const AGE_COLORS: Record<string, string> = {
  "18-24": "#f5a623",
  "25-34": "#7c3aed",
  "35-44": "#10b981",
  "45-54": "#1e40af",
  "55-64": "#ec4899",
  "65+": "#38bdf8"
};

export type DemographicDimension = "age" | "gender";

const GENDER_SEGMENTS = ["male", "female", "unknown"] as const;
const GENDER_COLORS: Record<string, string> = {
  male: "#3b82f6",
  female: "#ec4899",
  unknown: "#94a3b8"
};
/** Gênero do Google (gender_view) mapeado para os segmentos do card. */
const GOOGLE_GENDER_MAP: Record<string, string> = {
  MALE: "male",
  FEMALE: "female",
  UNDETERMINED: "unknown"
};

const DIMENSION_CFG: Record<
  DemographicDimension,
  { segments: readonly string[]; colors: Record<string, string>; googleMap: Record<string, string> }
> = {
  age: { segments: AGE_BUCKETS, colors: AGE_COLORS, googleMap: GOOGLE_AGE_MAP },
  gender: { segments: GENDER_SEGMENTS, colors: GENDER_COLORS, googleMap: GOOGLE_GENDER_MAP }
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

function emptyBuckets(segments: readonly string[]) {
  const aggregated = new Map<string, { spend: number; conversions: number }>();
  for (const bucket of segments) {
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
  dimension?: DemographicDimension;
}): Promise<AgeBreakdownRow[]> {
  const dimension = input.dimension ?? "age";
  const cfg = DIMENSION_CFG[dimension];
  const { adAccounts, clientIds } = await resolveDashboardScope(
    input.tenantId,
    input.clientId,
    input.adAccountId
  );

  const aggregated = emptyBuckets(cfg.segments);
  const datePreset = datePresetFromDays(input.days);
  const { metaAccessToken } = await resolveMetaTokensForApi(input.tenantId, input.userId, null);

  if (metaAccessToken) {
    for (const account of adAccounts) {
      try {
        const rows = await fetchInsightsWithBreakdowns(
          metaAccessToken,
          account.metaAdAccountId,
          [dimension],
          datePreset,
          "campaign"
        );
        for (const row of rows) {
          const seg = String((row as Record<string, unknown>)[dimension] ?? "").toLowerCase();
          if (!seg || !aggregated.has(seg)) continue;
          const spend = Number(row.spend ?? 0);
          const conversions = pickConversions(row.actions) || pickResults(row) || 0;
          const prev = aggregated.get(seg)!;
          aggregated.set(seg, {
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
  if (adAccounts.length && totalSpendLive <= 0) {
    const { audienceInsightBreakdown: repo } = await repositories();
    const periodDays = periodDaysBucket(input.days);
    const metaClientIds = [...new Set(adAccounts.map((a) => a.clientId))];
    const metaIds = adAccounts.map((a) => a.metaAdAccountId);
    const dbRows = await repo.find({
      where: {
        clientId: In(metaClientIds),
        metaAdAccountId: In(metaIds),
        breakdownType: dimension,
        periodDays
      }
    });
    for (const row of dbRows) {
      const seg = String(row.breakdownValue ?? "").toLowerCase();
      if (!aggregated.has(seg)) continue;
      const spend = Number(row.spend);
      const conversions = Number(row.conversions);
      const prev = aggregated.get(seg)!;
      aggregated.set(seg, {
        spend: prev.spend + spend,
        conversions: prev.conversions + conversions
      });
    }
  }

  // Google Ads: mesma dimensão (age_range_view / gender_view) somada aos buckets. Ao vivo
  // e resiliente — falha/ausência de conexão não derruba o card do Meta.
  if (isGoogleAdsEnabled() && clientIds.length) {
    const { client: clientRepo } = await repositories();
    const clients = await clientRepo.find({
      where: { id: In(clientIds), tenantId: input.tenantId }
    });
    const customerIds = [
      ...new Set(
        clients
          .map((c) => c.googleAdsCustomerId?.replace(/\D/g, ""))
          .filter((v): v is string => !!v)
      )
    ];
    if (customerIds.length) {
      const token = await getWorkspaceGoogleAccessToken(input.tenantId);
      if (token) {
        const { since, until } = rangeFromDays(input.days);
        for (const cid of customerIds) {
          try {
            const rows = await getBreakdown(token, cid, dimension, { since, until });
            for (const r of rows) {
              const bucket = cfg.googleMap[r.label];
              if (!bucket || !aggregated.has(bucket)) continue;
              const prev = aggregated.get(bucket)!;
              aggregated.set(bucket, {
                spend: prev.spend + r.cost,
                conversions: prev.conversions + r.conversions
              });
            }
          } catch {
            /* skip customer */
          }
        }
      }
    }
  }

  const totalSpend = [...aggregated.values()].reduce((sum, row) => sum + row.spend, 0);

  return cfg.segments.map((segment) => {
    const agg = aggregated.get(segment)!;
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
    return {
      segment,
      spend: agg.spend,
      sharePct: totalSpend > 0 ? (agg.spend / totalSpend) * 100 : 0,
      conversions: agg.conversions,
      cpa,
      color: cfg.colors[segment] ?? "#94a3b8"
    };
  });
}
