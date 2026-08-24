import "server-only";

import { Between, In, IsNull, Not } from "typeorm";

import { repositories } from "@/db/repositories";
import { rollingDaysEndingYesterday } from "@/lib/report-period";

export type TopPerformingAd = {
  adName: string;
  ctr: number;
  spend: number;
  impressions: number;
};

/**
 * Anúncio (não campanha/adset) de melhor CTR real do cliente na janela — usado pelo
 * Estúdio Criativo pra ancorar a geração num gancho que já converteu, não um chute.
 * Exige um mínimo de impressões pra não pescar ruído de anúncio recém-criado.
 */
export async function getTopPerformingAdHook(
  tenantId: string,
  clientId: string,
  windowDays = 28,
  minImpressions = 500
): Promise<TopPerformingAd | null> {
  void tenantId;
  const { adAccount, adMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return null;

  const accountIds = accounts.map((a) => a.id);
  const { since, until } = rollingDaysEndingYesterday(windowDays);

  const snapshots = await adMetricSnapshot.find({
    where: {
      adAccountId: In(accountIds),
      day: Between(since, until),
      metaAdId: Not(IsNull())
    }
  });
  if (!snapshots.length) return null;

  const byAd = new Map<string, { adName: string; spend: number; impressions: number; clicks: number }>();
  for (const row of snapshots) {
    const key = row.metaAdId ?? row.adName ?? "unknown";
    const cur = byAd.get(key) ?? {
      adName: row.adName || "Anúncio sem nome",
      spend: 0,
      impressions: 0,
      clicks: 0
    };
    cur.spend += Number(row.spend) || 0;
    cur.impressions += Number(row.impressions) || 0;
    cur.clicks += Number(row.clicks) || 0;
    byAd.set(key, cur);
  }

  let best: TopPerformingAd | null = null;
  for (const ad of byAd.values()) {
    if (ad.impressions < minImpressions) continue;
    const ctr = (ad.clicks / ad.impressions) * 100;
    if (!best || ctr > best.ctr) {
      best = { adName: ad.adName, ctr, spend: ad.spend, impressions: ad.impressions };
    }
  }

  return best;
}
