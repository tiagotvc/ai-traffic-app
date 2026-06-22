import "server-only";

import { repositories } from "@/db/repositories";
import { getClientBySlugOrId, slugify } from "@/lib/app-context";
import {
  aggregateCreativesFromAccountData,
  getTopCreativesByPreset,
  mapAggregatesToCreatives,
  type CreativeAgg
} from "@/lib/agency-brain/creative-intelligence";
import { fetchAllAccountCreatives, type AccountCreativesFetchResult } from "@/lib/creatives-access";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { loadRankConfig } from "@/lib/ranking-config";
import { resolvedPeriodDays, type ParsedPeriod } from "@/lib/report-period";

export type ReportCreativeGroup = ReturnType<typeof getTopCreativesByPreset>[number];

export type ClientCreativesPerformance = {
  groups: ReportCreativeGroup[];
  creatives: ReturnType<typeof mapAggregatesToCreatives>;
};

export async function loadClientCreativesPerformance(input: {
  tenantId: string;
  clientParam: string;
  adAccountId?: string | null;
  since: string;
  until: string;
  period?: Pick<ParsedPeriod, "preset" | "since" | "until" | "days" | "allTime">;
  skipCache?: boolean;
  /** Evita segunda ida à Meta quando o caller já buscou os dados. */
  perAccount?: AccountCreativesFetchResult[];
}): Promise<ClientCreativesPerformance> {
  const client = await getClientBySlugOrId(input.tenantId, input.clientParam);
  if (!client) return { groups: [], creatives: [] };

  const tokens = await getAllTenantMetaTokens(input.tenantId);
  if (!tokens.length) return { groups: [], creatives: [] };

  const { adAccount: adAccountRepo, campaignPreset: presetRepo } = await repositories();
  let accounts = await adAccountRepo.find({ where: { clientId: client.id } });
  if (input.adAccountId) {
    accounts = accounts.filter(
      (a) => a.metaAdAccountId === input.adAccountId || a.id === input.adAccountId
    );
  }
  if (!accounts.length) return { groups: [], creatives: [] };

  const presetRows = await presetRepo.find({ where: { tenantId: input.tenantId } });
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));
  const rankConfig = await loadRankConfig(input.tenantId);

  const perAccount =
    input.perAccount ??
    (
      await fetchAllAccountCreatives(accounts, {
        tokens,
        since: input.since,
        until: input.until,
        tenantId: input.tenantId,
        clientId: client.id,
        skipCache: input.skipCache ?? true
      })
    ).results;

  const clientSlug = slugify(client.name);
  const byCreative = new Map<string, CreativeAgg>();

  for (const { ads, insights } of perAccount) {
    aggregateCreativesFromAccountData({
      ads,
      insights,
      clientSlug,
      presetByCampaign,
      into: byCreative
    });
  }

  const creatives = mapAggregatesToCreatives(byCreative, clientSlug, presetByCampaign);
  const periodDays = input.period
    ? resolvedPeriodDays({
        preset: input.period.preset ?? "thisWeek",
        since: input.period.since ?? input.since,
        until: input.period.until ?? input.until,
        days: input.period.days ?? null,
        allTime: input.period.allTime ?? false
      })
    : null;

  return {
    groups: getTopCreativesByPreset(creatives, rankConfig, { periodDays }),
    creatives
  };
}
