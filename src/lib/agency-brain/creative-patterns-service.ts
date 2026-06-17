import type { AggregatedCreative } from "@/lib/agency-brain/creative-intelligence";
import type { SuggestedLearningDraft } from "@/lib/agency-brain/types";
import { buildDedupeKey } from "@/lib/agency-brain/learning-rules";

export type CreativePatternRow = {
  key: string;
  name: string;
  spend: number;
  ctr: number;
  roas: number;
  frequency: number;
  tier: "winner" | "fatigue" | "underperformer";
  thumbnailUrl: string | null;
};

export function classifyCreativePatterns(creatives: AggregatedCreative[]): CreativePatternRow[] {
  const rows: CreativePatternRow[] = [];

  for (const c of creatives) {
    const spend = Number(c.metrics.spend ?? 0);
    const ctr = Number(c.metrics.ctr ?? 0);
    const roas = Number(c.metrics.roas ?? 0);
    const frequency = Number(c.metrics.frequency ?? 0);
    if (spend < 30) continue;

    let tier: CreativePatternRow["tier"] | null = null;
    if (frequency >= 3.5 && ctr < 1 && spend >= 100) {
      tier = "fatigue";
    } else if (roas >= 2 || ctr >= 1.5) {
      tier = "winner";
    } else if (spend >= 150 && roas < 1 && ctr < 0.8) {
      tier = "underperformer";
    }

    if (!tier) continue;
    rows.push({
      key: c.key,
      name: c.name,
      spend,
      ctr,
      roas,
      frequency,
      tier,
      thumbnailUrl: c.thumbnailUrl
    });
  }

  return rows.sort((a, b) => b.spend - a.spend).slice(0, 20);
}

export function fatiguedCreativesToLearningDrafts(
  creatives: AggregatedCreative[],
  clientId: string,
  windowDays: number
): SuggestedLearningDraft[] {
  const drafts: SuggestedLearningDraft[] = [];

  for (const c of creatives) {
    const spend = Number(c.metrics.spend ?? 0);
    const ctr = Number(c.metrics.ctr ?? 0);
    const frequency = Number(c.metrics.frequency ?? 0);
    if (!(frequency >= 3.5 && ctr < 1 && spend >= 100)) continue;

    const campaignId = c.campaigns[0]?.id ?? "creative";
    drafts.push({
      title: `Fadiga criativa: "${c.name}"`,
      description: `CTR ${ctr.toFixed(2)}% com frequência ${frequency.toFixed(1)} e R$ ${spend.toFixed(0)} gastos. Considere renovar o criativo.`,
      category: "CREATIVE",
      impact: spend >= 300 ? "HIGH" : "MEDIUM",
      confidence: spend >= 200 ? "MEDIUM" : "LOW",
      metaCampaignId: campaignId !== "creative" ? campaignId : null,
      metricSnapshot: { ctr, frequency, spend, periodDays: windowDays },
      evidence: {
        ruleId: "creative_fatigue",
        reason: "CTR down + frequency up + stable spend",
        actualValue: frequency,
        metaCampaignId: campaignId !== "creative" ? campaignId : undefined,
        campaignName: c.campaigns[0]?.name
      },
      dedupeKey: buildDedupeKey("creative_fatigue", clientId, c.key, windowDays),
      tags: ["fatigue", "creative", "saturation"]
    });
  }

  return drafts.slice(0, 5);
}
