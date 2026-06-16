import "server-only";

import type { CampaignMetricsRow } from "@/lib/agency-brain/types";
import { avgCpa, avgCtr, avgRoas, pctDelta } from "@/lib/agency-brain/learning-rules";

const SPIKE_THRESHOLD_PCT = 25;

export type MetricSpikeDraft = {
  title: string;
  description: string;
  metaCampaignId: string | null;
  metric: "cpa" | "ctr" | "roas";
  deltaPct: number;
};

function campaignTotals(rows: CampaignMetricsRow[]) {
  const byCampaign = new Map<string, CampaignMetricsRow[]>();
  for (const r of rows) {
    const list = byCampaign.get(r.metaCampaignId) ?? [];
    list.push(r);
    byCampaign.set(r.metaCampaignId, list);
  }
  return byCampaign;
}

export function detectMetricSpikes(
  current: CampaignMetricsRow[],
  previous: CampaignMetricsRow[]
): MetricSpikeDraft[] {
  if (!current.length || !previous.length) return [];

  const spikes: MetricSpikeDraft[] = [];
  const prevByCampaign = campaignTotals(previous);
  const curByCampaign = campaignTotals(current);

  for (const [campaignId, curRows] of curByCampaign) {
    const prevRows = prevByCampaign.get(campaignId);
    if (!prevRows?.length) continue;

    const name = curRows[0]?.campaignName ?? campaignId;
    const curCpa = avgCpa(curRows);
    const prevCpa = avgCpa(prevRows);
    if (curCpa != null && prevCpa != null && prevCpa > 0) {
      const delta = pctDelta(curCpa, prevCpa);
      if (Math.abs(delta) >= SPIKE_THRESHOLD_PCT) {
        spikes.push({
          title: `Variação de CPA — ${name}`,
          description: `CPA ${delta > 0 ? "subiu" : "caiu"} ${Math.abs(delta).toFixed(0)}% vs. período anterior.`,
          metaCampaignId: campaignId,
          metric: "cpa",
          deltaPct: delta
        });
      }
    }

    const curCtr = avgCtr(curRows);
    const prevCtr = avgCtr(prevRows);
    if (curCtr != null && prevCtr != null && prevCtr > 0) {
      const delta = pctDelta(curCtr, prevCtr);
      if (Math.abs(delta) >= SPIKE_THRESHOLD_PCT) {
        spikes.push({
          title: `Variação de CTR — ${name}`,
          description: `CTR ${delta > 0 ? "subiu" : "caiu"} ${Math.abs(delta).toFixed(0)}% vs. período anterior.`,
          metaCampaignId: campaignId,
          metric: "ctr",
          deltaPct: delta
        });
      }
    }

    const curRoas = avgRoas(curRows);
    const prevRoas = avgRoas(prevRows);
    if (curRoas != null && prevRoas != null && prevRoas > 0) {
      const delta = pctDelta(curRoas, prevRoas);
      if (Math.abs(delta) >= SPIKE_THRESHOLD_PCT) {
        spikes.push({
          title: `Variação de ROAS — ${name}`,
          description: `ROAS ${delta > 0 ? "subiu" : "caiu"} ${Math.abs(delta).toFixed(0)}% vs. período anterior.`,
          metaCampaignId: campaignId,
          metric: "roas",
          deltaPct: delta
        });
      }
    }
  }

  return spikes.slice(0, 5);
}
