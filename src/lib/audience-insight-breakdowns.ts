import "server-only";

import { repositories } from "@/db/repositories";
import {
  fetchInsightsWithBreakdowns,
  pickConversions,
  pickResults
} from "@/lib/meta-graph";

export async function syncAudienceInsightBreakdowns(input: {
  clientId: string;
  metaAdAccountId: string;
  accessToken: string;
  periodDays?: number;
}): Promise<{ synced: number }> {
  const periodDays = input.periodDays ?? 30;
  const datePreset = periodDays <= 7 ? "last_7d" : periodDays <= 14 ? "last_14d" : "last_30d";
  const { audienceInsightBreakdown: repo } = await repositories();
  const now = new Date();
  let synced = 0;

  const breakdownTypes: Array<{ type: "age" | "gender" | "region"; field: "age" | "gender" | "region" }> = [
    { type: "age", field: "age" },
    { type: "gender", field: "gender" },
    { type: "region", field: "region" }
  ];

  for (const { type, field } of breakdownTypes) {
    const rows = await fetchInsightsWithBreakdowns(
      input.accessToken,
      input.metaAdAccountId,
      [type],
      datePreset,
      "campaign"
    );

    const aggregated = new Map<
      string,
      { spend: number; conversions: number; raw: Record<string, unknown> }
    >();

    for (const row of rows) {
      const value = String(row[field] ?? "unknown");
      if (!value || value === "unknown") continue;
      const spend = Number(row.spend ?? 0);
      const conversions = pickConversions(row.actions) || pickResults(row) || 0;
      const prev = aggregated.get(value) ?? { spend: 0, conversions: 0, raw: {} };
      aggregated.set(value, {
        spend: prev.spend + spend,
        conversions: prev.conversions + conversions,
        raw: row as unknown as Record<string, unknown>
      });
    }

    for (const [breakdownValue, agg] of aggregated) {
      const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
      const existing = await repo.findOne({
        where: {
          clientId: input.clientId,
          metaAdAccountId: input.metaAdAccountId,
          breakdownType: type,
          breakdownValue,
          periodDays
        }
      });
      const row =
        existing ??
        repo.create({
          clientId: input.clientId,
          metaAdAccountId: input.metaAdAccountId,
          breakdownType: type,
          breakdownValue,
          periodDays
        });
      row.spend = String(agg.spend);
      row.conversions = String(agg.conversions);
      row.cpa = cpa != null ? String(cpa) : null;
      row.rawRow = agg.raw;
      row.syncedAt = now;
      await repo.save(row);
      synced++;
    }
  }

  return { synced };
}

export async function getAudienceBreakdownContext(
  clientId: string,
  metaAdAccountId: string,
  periodDays = 30
): Promise<
  Array<{
    breakdownType: string;
    breakdownValue: string;
    spend: number;
    conversions: number;
    cpa: number | null;
  }>
> {
  const { audienceInsightBreakdown: repo } = await repositories();
  const rows = await repo.find({
    where: { clientId, metaAdAccountId, periodDays },
    order: { conversions: "DESC" },
    take: 60
  });
  return rows.map((r) => ({
    breakdownType: r.breakdownType,
    breakdownValue: r.breakdownValue,
    spend: Number(r.spend),
    conversions: Number(r.conversions),
    cpa: r.cpa != null ? Number(r.cpa) : null
  }));
}
