import type { MetricKey } from "@/lib/dashboard-metrics";

export type CampaignPresetKey = "default" | "lead_whatsapp" | "lead_site" | "sales" | "reach";

export const CAMPAIGN_PRESETS: CampaignPresetKey[] = [
  "default",
  "lead_whatsapp",
  "lead_site",
  "sales",
  "reach"
];

/** Métricas mais importantes por tipo de campanha. */
export const PRESET_METRICS: Record<CampaignPresetKey, MetricKey[]> = {
  default: ["spend", "conversions", "ctr", "roas"],
  lead_whatsapp: ["messages", "cpmsg", "ctr", "spend"],
  lead_site: ["conversions", "cpa", "ctr", "spend"],
  sales: ["roas", "conversions", "cpa", "spend"],
  reach: ["reach", "impressions", "cpm", "frequency"]
};

export function presetMetricsFor(preset?: string | null): MetricKey[] {
  return PRESET_METRICS[(preset as CampaignPresetKey) ?? "default"] ?? PRESET_METRICS.default;
}
